"""Namu-Voice-Zarma — speech synthesis for Zarma, and for the voices that come with it.

    modal deploy namu_voice_zarma.py

Tafiya's second engine, beside namu_voice.py (Hausa on Tenere, French on base OmniVoice). One model:
C-250, Namu's joint Zarma + Hausa fine-tune of Tenere (zarma-exploration, run 20261101-5-t1, checkpoint-250, 40 %
Hausa replay), shipped as the private bundle `Namuorg/zarma-tts-c250-mouhamad` with the reference clips of its
voice. The gateway sends a voice here when its VOICES entry names this service; the website and the API see one
model, Tafiya, and voices that each speak one or more languages.

    mouhamad   dje (default), ha     the founder's own voice, with his consent (zarma-exploration RIGHTS.tsv,
                                     owner_voice_mouhamad); one reference clip per language

    POST /v1/speak   {"text": "...", "language": "dje", "voice": "mouhamad"}  -> audio/wav
    POST /v1/warm    empty                                                     -> {"status": "warm"}
    GET  /v1/health                                                            -> model, voices

Rendering is the one C-250 was evaluated with (zarma-exploration serving/modal/zarma_voice.py, after the cascade's
TTS worker): fp16, 32 steps, the language id, each reference encoded once, units of at most 30 words joined by 0.2 s
of silence, a fixed seed. Zarma text is first prepared by the language pack's frontend (dje/, copied). Library
versions are pinned to the ones those evaluations ran with, unlike namu_voice.py.

Quality: no native Zarma listener has rated it yet (zarma-exploration human_eval P-dje-1); the speech recogniser reads
the Zarma back at about 10 % character error and the Hausa at about 1.5 %. It ships as part of a preview.
"""

import os

import modal

BUNDLE = "Namuorg/zarma-tts-c250-mouhamad"
BUNDLE_REV = "148b7e9e5dcb6c59aca8883cbda47fc0edf65bf9"   # reference clips v3 (shorter pauses)
TOKENIZER = "eustlb/higgs-audio-v2-tokenizer"            # the audio tokenizer OmniVoice loads, not in the bundle
TOKENIZER_REV = "528e871c2a26c4f0f7773b9754e2e1acae20899d"
MODEL_DIR = "/c250"
DJE_DIR = "/root/dje"
HERE = os.path.dirname(os.path.abspath(__file__))

SAMPLE_RATE = 24000
MIN_CONTAINERS = 0
NUM_STEP_DEFAULT = 32
NUM_STEP_RANGE = (4, 64)    # as namu_voice.py: a caller's num_step is pulled into this range, which bounds the cost
UNIT_MAX_WORDS = 30
UNIT_GAP_S = 0.2
MAX_CHARS = 2000            # the gateway's own limit; a direct caller cannot hold the GPU longer

# The voices this engine speaks, and its reference clip in each language (reference_voice/<name>.json in the bundle).
# The first language is the one a request without "language" gets.
VOICES = {"mouhamad": {"dje": "reference", "ha": "reference_ha"}}
DEFAULT_VOICE = "mouhamad"

# A voice whose speaker withdraws consent goes here, and is refused with 400: never another voice in its place.
WITHDRAWN_VOICES: frozenset[str] = frozenset()


def served(language: str | None, voice: str | None) -> bool:
    """Whether a request may be spoken: a voice this engine has, in a language it speaks, not withdrawn."""
    v = voice or DEFAULT_VOICE
    if not isinstance(v, str) or not isinstance(language or "", str):
        return False
    return v in VOICES and v not in WITHDRAWN_VOICES and (language or next(iter(VOICES[v]))) in VOICES[v]


def clamp_num_step(requested) -> int:
    """The step count to run: the default when none (or nonsense) is asked for, else the request in NUM_STEP_RANGE."""
    if not requested:
        return NUM_STEP_DEFAULT
    try:
        steps = int(requested)
    except (TypeError, ValueError, OverflowError):
        return NUM_STEP_DEFAULT
    return max(NUM_STEP_RANGE[0], min(NUM_STEP_RANGE[1], steps))


def split_units(text: str, max_words: int) -> list:
    """Greedy split at sentence then clause punctuation into units of at most `max_words` words (Aïr's rule).
    Copied from zarma-exploration core/cascade/text.py `split_units`, so text is cut as the model was evaluated."""
    import re

    words_ = text.split()
    if len(words_) <= max_words:
        return [text]
    pieces = re.split(r"(?<=[.!?;:])\s+", text)
    out = []
    for p in pieces:
        if len(p.split()) <= max_words:
            out.append(p)
            continue
        sub = re.split(r"(?<=,)\s+", p)
        cur = []
        for s in sub:
            if cur and len(" ".join(cur + [s]).split()) > max_words:
                out.append(" ".join(cur))
                cur = []
            cur.append(s)
        if cur:
            out.append(" ".join(cur))
    merged = []
    for u in out:
        if merged and len((merged[-1] + " " + u).split()) <= max_words:
            merged[-1] = merged[-1] + " " + u
        else:
            merged.append(u)
    final = []
    for u in merged:
        w = u.split()
        while len(w) > max_words:
            final.append(" ".join(w[:max_words]))
            w = w[max_words:]
        if w:
            final.append(" ".join(w))
    return final


app = modal.App("namu-voice-zarma")

# Locked like the other model services (namu_voice.py, "lockdown"): Modal refuses any request without the
# workspace's Modal-Key / Modal-Secret before a container starts. Only the gateway holds them.
REQUIRE_PROXY_AUTH = True


def _download():
    import os

    from huggingface_hub import snapshot_download

    snapshot_download(BUNDLE, revision=BUNDLE_REV, local_dir=MODEL_DIR, token=os.environ["HF_TOKEN"])
    snapshot_download(TOKENIZER, revision=TOKENIZER_REV, local_dir=f"{MODEL_DIR}/audio_tokenizer",
                      allow_patterns=["*.json", "*.safetensors", "*.txt", "*.model"])


image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg", "libsndfile1")
    # zarma-exploration envs/tts_alt/uv.lock, the versions C-250 was trained and evaluated with
    .pip_install("torch==2.8.0", "torchaudio==2.8.0", "omnivoice==0.2.1", "transformers==5.3.0",
                 "accelerate==1.15.0", "soundfile", "numpy", "huggingface_hub", "fastapi[standard]")
    .run_function(_download, secrets=[modal.Secret.from_name("huggingface-token")])
    .add_local_file(f"{HERE}/dje/verbalize.py", f"{DJE_DIR}/verbalize.py")
    .add_local_file(f"{HERE}/dje/normalize.py", f"{DJE_DIR}/normalize.py")
    .add_local_file(f"{HERE}/dje/spelling_variants.tsv", f"{DJE_DIR}/spelling_variants.tsv")
)

with image.imports():
    import importlib.util
    import io
    import json
    import time

    import numpy as np
    import soundfile as sf
    import torch
    from omnivoice import OmniVoice


@app.cls(image=image, gpu="A10", max_containers=2, min_containers=MIN_CONTAINERS, scaledown_window=600, timeout=900)
class Voice:
    @modal.enter()
    def load(self):
        t = time.time()
        self.model = OmniVoice.from_pretrained(MODEL_DIR, device_map="cuda:0", dtype=torch.float16)
        self.prompts = {}
        for vid, langs in VOICES.items():
            for lang, name in langs.items():
                meta = json.load(open(f"{MODEL_DIR}/reference_voice/{name}.json", encoding="utf-8"))
                wav = f"{MODEL_DIR}/reference_voice/{meta['ref_audio']}"
                self.prompts[(vid, lang)] = self.model.create_voice_clone_prompt(ref_audio=wav, ref_text=meta["ref_text"])
        spec = importlib.util.spec_from_file_location("dje_verbalize", f"{DJE_DIR}/verbalize.py")
        self.verbalize = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.verbalize)
        self._say("Fofo.", "dje")      # warm the kernels
        self._say("Sannu.", "ha")
        print(f"ready in {time.time() - t:.1f}s | voices={self._listed()}", flush=True)

    def _say(self, text: str, language: str | None = None, voice: str | None = None, num_step=None):
        vid = voice or DEFAULT_VOICE
        lang = language or next(iter(VOICES[vid]))
        prompt = self.prompts[(vid, lang)]
        text = text.strip()[:MAX_CHARS]
        if lang == "dje":
            text = self.verbalize.prepare_tts_text(text)
        units = split_units(text, UNIT_MAX_WORDS)
        steps = clamp_num_step(num_step)
        torch.manual_seed(0)           # the same text in the same voice sounds the same each time
        t = time.time()
        audios = self.model.generate(text=units, language=[lang] * len(units), num_step=steps,
                                     voice_clone_prompt=[prompt] * len(units))
        secs = time.time() - t
        parts = [np.asarray(w, dtype=np.float32).reshape(-1) for w in audios]
        gap = np.zeros(int(UNIT_GAP_S * SAMPLE_RATE), dtype=np.float32)
        a = parts[0] if len(parts) == 1 else np.concatenate([x for p in parts for x in (p, gap)][:-1])
        a = np.nan_to_num(a)
        # OmniVoice copies the reference's level as well as its voice: peak-normalise, as namu_voice.py does.
        peak = float(np.max(np.abs(a))) if len(a) else 0.0
        if peak > 1e-6:
            a = a * (0.95 / peak)
        buf = io.BytesIO()
        sf.write(buf, a, SAMPLE_RATE, format="WAV", subtype="PCM_16")
        return buf.getvalue(), secs, steps

    def _listed(self) -> dict:
        """The voices this container speaks in, by voice: its languages, less what is withdrawn."""
        return {v: list(langs) for v, langs in VOICES.items() if v not in WITHDRAWN_VOICES}

    @modal.method()
    def speak(self, text: str, language: str | None = None, voice: str | None = None) -> bytes:
        if not served(language, voice):
            raise ValueError(f"voice {voice!r} does not speak {language!r} here")
        return self._say(text, language, voice)[0]

    @modal.asgi_app(requires_proxy_auth=REQUIRE_PROXY_AUTH)
    def api(self):
        from fastapi import FastAPI, Request
        from fastapi.responses import JSONResponse, Response

        web = FastAPI(title="Namu-Voice-Zarma", version="1.0", description="Zarma and Hausa speech synthesis.")
        # No CORS on purpose: only the gateway calls this service, with the proxy token.

        @web.get("/v1/health")
        def health():
            return {"service": "Namu-Voice-Zarma", "task": "speech-synthesis", "sample_rate": SAMPLE_RATE,
                    "model": BUNDLE, "revision": BUNDLE_REV, "voices": self._listed(),
                    "default_voice": DEFAULT_VOICE, "num_step_default": NUM_STEP_DEFAULT,
                    "container": os.environ.get("MODAL_TASK_ID", "?")}

        @web.post("/v1/warm")
        async def warm():
            return {"status": "warm", "container": os.environ.get("MODAL_TASK_ID", "?")}

        @web.post("/v1/speak")
        async def speak(request: Request):
            """Returns audio/wav (24 kHz, 16-bit). Pass {"format": "json"} for base64 instead."""
            body = await request.json() if await request.body() else {}
            if not isinstance(body, dict):
                return JSONResponse({"error": "send a JSON object"}, status_code=400)
            text = str(body.get("text") or "").strip()
            if not text:
                return JSONResponse({"status": "warm", "voices": self._listed()})
            language, voice = body.get("language"), body.get("voice")
            if not served(language, voice):
                return JSONResponse({"error": "unknown voice: this voice or language is not served here"},
                                    status_code=400)
            try:
                wav, secs, steps = self._say(text, language, voice, body.get("num_step"))
            except Exception as e:
                return JSONResponse({"error": f"{type(e).__name__}: {e}"}, status_code=503)
            if body.get("format") == "json":
                import base64

                return JSONResponse({"audio": base64.b64encode(wav).decode(), "sample_rate": SAMPLE_RATE,
                                     "seconds": round(secs, 3)})
            return Response(content=wav, media_type="audio/wav",
                            headers={"X-Synth-Seconds": f"{secs:.2f}", "X-Num-Step": str(steps)})

        return web
