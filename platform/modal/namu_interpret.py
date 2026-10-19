"""Namu-Interpret — Hausa <-> French speech translation, both directions.

    modal deploy namu_interpret.py

CPU only; it orchestrates the two GPU services and the translation model.

    POST /v1/translate  {"text":..., "source":"ha", "target":"fr"} -> text
    POST /v1/speech     audio + ?source=ha&target=fr               -> spoken turn
    GET  /v1/health

/v1/translate is the endpoint LiveKit uses: in a LiveKit session the STT and TTS
slots are already filled by Namu-Transcribe and Namu-Voice, so the interpreter
is just a text-to-text step in the LLM slot.

ASR routing: Hausa goes to Namu-Transcribe (our NCAIR1 model). French goes to
OpenAI, because Namu-Transcribe is Hausa-only — the French half is not a Namu
model and is labelled as such in /v1/health rather than quietly implied.

The Hausa orthography block in the prompt is load bearing. The hooked consonants
ɓ ɗ ƙ ƴ are separate phonemes, and a model that writes 'bude' for 'buɗe' hands
the synthesiser a different word. Adding this block is what made the output
consistent.
"""

import modal

TRANSCRIBE_URL = "https://namu-ai-lab--namu-transcribe-transcribe-api.modal.run"
VOICE_URL = "https://namu-ai-lab--namu-voice-voice-api.modal.run"

FR_STT_MODEL = "gpt-4o-mini-transcribe"     # not a Namu model — French ASR only
TEXT_MODEL = "gpt-4.1-mini"

app = modal.App("namu-interpret")

# --- lockdown ---------------------------------------------------------------
# When True, Modal itself rejects any request that lacks valid Modal-Key /
# Modal-Secret headers, at its edge and BEFORE a container boots, so a stranger
# who finds this URL can neither use the model nor make us pay for a GPU cold
# start. Only namu-gateway (and the internal services below) hold the token.
# Flip to True after the `namu-proxy-auth` Modal secret exists (Modal dashboard
# -> Settings -> Proxy auth tokens), then redeploy. See platform/README.md.
REQUIRE_PROXY_AUTH = False


def _internal_headers(extra: dict | None = None) -> dict:
    """Headers for calls to the other Namu services: Modal proxy-auth when the
    namu-proxy-auth secret is attached, nothing extra otherwise."""
    import os

    h = dict(extra or {})
    key, secret = os.environ.get("MODAL_PROXY_KEY"), os.environ.get("MODAL_PROXY_SECRET")
    if key and secret:
        h["Modal-Key"], h["Modal-Secret"] = key, secret
    return h

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install("fastapi[standard]", "requests", "openai>=1.40")
)

_ORTHOGRAPHY = (
    "\nORTHOGRAPHY IS CRITICAL — this text is read aloud by a speech synthesiser.\n"
    "Hausa has four hooked consonants that are SEPARATE PHONEMES, not accents:\n"
    "  ɓ (not b)   ɗ (not d)   ƙ (not k)   ƴ (not y)\n"
    "Writing the plain letter instead gives a different word and the synthesiser "
    "says the wrong sound. ALWAYS use the hooked form where the word requires it, "
    "and capitalise as Ɓ Ɗ Ƙ Ƴ at the start of a sentence.\n"
    "Common words that MUST carry them:\n"
    "  buɗe (open), ƙofa (door), ƙasa (land/country), ƙarfe (o'clock/iron),\n"
    "  ƙarami/ƙanana (small), ɗan/ɗaya (son/one), ɓata (spoil), ƙauye (village),\n"
    "  ƙwai (egg), ɗaki (room), ƙarshe (end), ɓoye (hide), ƙoƙari (effort),\n"
    "  matuƙar (very), ƙwarai (greatly), ɗauka (take), ƙara (increase)\n"
    "Never strip these to ASCII. Never write 'bude' for 'buɗe' or 'karfe' for "
    "'ƙarfe'.\n"
)

PROMPTS = {
    ("fr", "ha"): (
        "You are a professional French-to-Hausa translator.\n"
        "Rules:\n"
        "- The user's text is always FRENCH. Output HAUSA only.\n"
        "- Never repeat the French back. Never output French or English.\n"
        "- Keep every concrete detail: names, numbers, places, dates.\n"
        "- Output ONLY the translation. No quotes, no notes, no explanation.\n"
        + _ORTHOGRAPHY +
        "\nExamples:\n"
        "  French: J'ai mal à la tête et de la fièvre.\n"
        "  You:    Ina jin ciwon kai da zazzabi.\n"
        "  French: Le marché ouvre à huit heures du matin.\n"
        "  You:    Kasuwa tana buɗe da ƙarfe takwas na safe.\n"
        "  French: Le petit garçon est parti au village.\n"
        "  You:    Ƙaramin yaro ya tafi ƙauye."
    ),
    ("ha", "fr"): (
        "You are a professional Hausa-to-French translator.\n"
        "Rules:\n"
        "- The user's text is always HAUSA. Output FRENCH only.\n"
        "- Never repeat the Hausa back. Never output Hausa or English.\n"
        "- Keep every concrete detail: names, numbers, places, dates.\n"
        "- Output ONLY the translation. No quotes, no notes, no explanation.\n"
        "- Write natural spoken French with correct accents (é è ê à ç ù), "
        "because the text is read aloud by a speech synthesiser.\n"
        "- The Hausa may come from a speech recogniser and contain small errors. "
        "Translate what was plainly meant; never comment on the errors.\n"
        "\nExamples:\n"
        "  Hausa:  Ina jin ciwon kai da zazzabi.\n"
        "  You:    J'ai mal à la tête et de la fièvre.\n"
        "  Hausa:  Kasuwa tana buɗe da ƙarfe takwas na safe.\n"
        "  You:    Le marché ouvre à huit heures du matin.\n"
        "  Hausa:  Ƙaramin yaro ya tafi ƙauye.\n"
        "  You:    Le petit garçon est parti au village."
    ),
}


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("openai-api-key")] + ([modal.Secret.from_name("namu-proxy-auth")] if REQUIRE_PROXY_AUTH else []),
    timeout=900,
    scaledown_window=600,
)
@modal.asgi_app(requires_proxy_auth=REQUIRE_PROXY_AUTH)
def api():
    import base64
    import os
    import tempfile
    import time

    import requests
    from fastapi import FastAPI, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from openai import OpenAI

    web = FastAPI(title="Namu-Interpret", version="1.0",
                  description="Hausa <-> French speech translation.")
    web.add_middleware(CORSMiddleware, allow_origins=["*"],
                       allow_methods=["*"], allow_headers=["*"])
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    def _translate(text: str, source: str, target: str) -> tuple[str, float]:
        prompt = PROMPTS.get((source, target))
        if prompt is None:
            raise ValueError(f"unsupported pair {source}->{target}")
        label = {"fr": "French", "ha": "Hausa"}[source]
        t = time.time()
        r = client.chat.completions.create(
            model=TEXT_MODEL,
            messages=[{"role": "system", "content": prompt},
                      {"role": "user", "content": f"{label}:\n{text}"}],
            max_tokens=300, temperature=0.2,
        )
        return (r.choices[0].message.content or "").strip(), time.time() - t

    def _listen(raw: bytes, language: str) -> tuple[str, float]:
        t = time.time()
        if language == "ha":
            r = requests.post(f"{TRANSCRIBE_URL}/v1/transcribe", data=raw,
                              headers=_internal_headers({"Content-Type": "application/octet-stream"}),
                              timeout=600)
            r.raise_for_status()
            return (r.json().get("text") or "").strip(), time.time() - t

        # OpenAI's SDK wants a real file handle with a usable extension.
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as fh:
            fh.write(raw)
            path = fh.name
        try:
            with open(path, "rb") as f:
                r = client.audio.transcriptions.create(
                    model=FR_STT_MODEL, file=f, language="fr")
            return (r.text or "").strip(), time.time() - t
        finally:
            os.unlink(path)

    @web.get("/v1/health")
    def health():
        return {"service": "Namu-Interpret", "task": "speech-translation",
                "pairs": ["ha->fr", "fr->ha"],
                "asr": {"ha": "Namu-Transcribe", "fr": FR_STT_MODEL},
                "translation_model": TEXT_MODEL,
                "tts": "Namu-Voice",
                "transcribe": TRANSCRIBE_URL, "voice": VOICE_URL}

    @web.post("/v1/translate")
    async def translate(request: Request):
        """Text to text. This is the endpoint a LiveKit session calls."""
        body = await request.json() if await request.body() else {}
        text = (body.get("text") or "").strip()
        source = body.get("source", "ha")
        target = body.get("target") or ("fr" if source == "ha" else "ha")
        if not text:
            return JSONResponse({"error": "no text"}, status_code=400)
        try:
            out, secs = _translate(text, source, target)
        except ValueError as e:
            return JSONResponse({"error": str(e)}, status_code=400)
        except Exception as e:
            return JSONResponse({"error": f"{type(e).__name__}: {str(e)[:200]}"},
                                status_code=502)
        return {"text": out, "source": source, "target": target,
                "model": TEXT_MODEL, "seconds": round(secs, 3)}

    @web.post("/v1/speech")
    async def speech(request: Request, source: str = "ha", target: str = ""):
        """Audio in one language, audio out in the other."""
        target = target or ("fr" if source == "ha" else "ha")
        if (source, target) not in PROMPTS:
            return JSONResponse({"error": f"unsupported pair {source}->{target}"},
                                status_code=400)

        ct = request.headers.get("content-type", "")
        if ct.startswith("multipart/form-data"):
            form = await request.form()
            upload = form.get("file")
            if upload is None:
                return JSONResponse({"error": "missing 'file' field"},
                                    status_code=400)
            raw = await upload.read()
        else:
            raw = await request.body()
        if not raw:
            return JSONResponse({"error": "empty audio body"}, status_code=400)

        timings = {}
        try:
            heard, secs = _listen(raw, source)
        except Exception as e:
            return JSONResponse({"error": f"transcribe: {type(e).__name__}: {e}"},
                                status_code=502)
        timings["transcribe"] = round(secs, 3)
        if not heard:
            return JSONResponse({"error": "nothing was heard"}, status_code=422)

        try:
            out, secs = _translate(heard, source, target)
        except Exception as e:
            return JSONResponse({"error": f"translate: {type(e).__name__}: {e}",
                                 "source_text": heard}, status_code=502)
        timings["translate"] = round(secs, 3)

        t = time.time()
        try:
            r = requests.post(f"{VOICE_URL}/v1/speak", headers=_internal_headers(),
                              json={"text": out, "language": target}, timeout=900)
            r.raise_for_status()
            wav = r.content
        except Exception as e:
            return JSONResponse({"error": f"speak: {type(e).__name__}: {e}",
                                 "source_text": heard, "target_text": out},
                                status_code=502)
        timings["speak"] = round(time.time() - t, 3)

        return {"source": source, "target": target,
                "source_text": heard, "target_text": out,
                "audio": base64.b64encode(wav).decode(), "sample_rate": 24000,
                "timings": timings,
                "total_seconds": round(sum(timings.values()), 3)}

    return web
