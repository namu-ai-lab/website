"""Namu-Agent — the conversational brain for the Hausa voice agent.

    modal deploy namu_agent.py

CPU only. It holds the system prompt, the reply-length policy and the model
choice; the GPU work lives in Namu-Transcribe and Namu-Voice.

    POST /v1/chat    {"messages":[...]} or {"text":"..."}  -> {"reply": ...}
    POST /v1/speech  raw audio body or multipart `file`    -> full spoken turn
    GET  /v1/health

/v1/chat is the endpoint LiveKit uses — LiveKit already owns the microphone and
the speaker, so it only needs the text turn. /v1/speech is the whole loop in one
call for clients that are not LiveKit (a browser page, a phone webhook, curl).

The length cap is enforced in code, not in the prompt. Synthesis time is linear
in word count and a model that is asked nicely to be brief will still, on some
turn, return a 63-word Markdown list that takes 93 seconds to speak.
"""

import modal

TRANSCRIBE_URL = "https://namu-ai-lab--namu-transcribe-transcribe-api.modal.run"
VOICE_URL = "https://namu-ai-lab--namu-voice-voice-api.modal.run"

# Chosen for LATENCY AND CONSISTENCY, which is what a voice agent lives on.
# Measured across eleven candidates on identical Hausa prompts:
#   gemini-3.5-flash-lite  1.3-1.7s, 51-56 tok/s, tight — 7 upstream endpoints
#                          so a congested one is routed around
#   qwen3.6-flash          1.7-7.3s, 17-46 tok/s — ONE upstream (Alibaba), no
#                          failover, so congestion becomes a 6s turn
#   gpt-5.6-luna           5.8s; best orthography of the lot, but ~4s of chat
#                          on top of listen+speak made turns 5-7s
# Rejected outright: tiny-aya-earth (loops; says Niger's capital is Abuja),
# c4ai-aya-expanse-32b (degenerate Hausa), qwen3.5-9b (wrong and slow),
# qwen3.8-max (9.6s, leaks English reasoning), gpt-5.5 (429s on this key).
# Gemini's weakness is orthography — it used the fewest hooked consonants of
# the top group — which the SYSTEM prompt's ɓ ɗ ƙ ƴ block is there to offset.
#
# A request may name one of CHAT_MODELS, so the default and its fallback can
# be compared in one request rather than one redeploy. The provider is inferred
# from the id, because OpenRouter ids are namespaced ("google/…") and Cohere's
# are not. Trying another model means adding it to CHAT_MODELS and redeploying:
# an open `model` field made this service a free proxy to every model on
# Namu's OpenRouter, OpenAI and Cohere keys.
MODEL = "google/gemini-3.5-flash-lite"
FALLBACK_MODEL = "qwen/qwen3.6-flash"
CHAT_MODELS = (MODEL, FALLBACK_MODEL)
OR_URL = "https://openrouter.ai/api/v1/chat/completions"

# Every message is sent to a paid model, so what one /v1/chat request may carry
# is capped before any provider is called. A voice turn is a sentence or two;
# a LiveKit context that outgrows this should send its most recent messages.
MAX_CHAT_MESSAGES = 40
MAX_MESSAGE_CHARS = 4000


OPENAI_URL = "https://api.openai.com/v1/chat/completions"
# The GPT-5 / o-series are reasoning models. They rename the token cap, reject
# `temperature`, and will happily spend the whole budget thinking unless told
# not to — which is the difference between a 1s reply and a 10s one.
OPENAI_REASONING = ("gpt-5", "o1", "o3", "o4")


def provider_for(model: str) -> str:
    if "/" in model:                       # OpenRouter ids are namespaced
        return "openrouter"
    if model.startswith(("gpt-", "chatgpt-", "o1", "o3", "o4")):
        return "openai"
    return "cohere"


def openai_payload(model: str, msgs: list[dict]) -> dict:
    p = {"model": model, "messages": msgs}
    if model.startswith(OPENAI_REASONING):
        p["max_completion_tokens"] = 500
        p["reasoning_effort"] = "minimal"
    else:
        p["max_tokens"] = 500
        p["temperature"] = 0.3
    return p


def chat_request(body) -> tuple[list[dict], str, str | None]:
    """The messages and model a /v1/chat body asks for, or why it is refused.

    -> (messages, model, None), or ([], "", reason) for a 400. Only role and
    content are kept (LiveKit chat contexts carry more), and empty messages
    are dropped.
    """
    if not isinstance(body, dict):
        return [], "", "send a JSON object"
    model = body.get("model") or MODEL
    if model not in CHAT_MODELS:
        return [], "", f"unknown model; use one of: {', '.join(CHAT_MODELS)}"
    messages = body.get("messages")
    if not messages:
        text = body.get("text") or ""
        messages = [{"role": "user", "content": text.strip() if isinstance(text, str) else text}]
    if not isinstance(messages, list) or not all(isinstance(m, dict) for m in messages):
        return [], "", "messages must be a list of {role, content}"
    if len(messages) > MAX_CHAT_MESSAGES:
        return [], "", f"at most {MAX_CHAT_MESSAGES} messages"
    kept = []
    for m in messages:
        content = m.get("content") or ""
        if not isinstance(content, str):
            return [], "", "content must be text"
        if len(content) > MAX_MESSAGE_CHARS:
            return [], "", f"at most {MAX_MESSAGE_CHARS} characters per message"
        if content.strip():
            kept.append({"role": "assistant" if m.get("role") == "assistant" else "user",
                         "content": content})
    if not kept:
        return [], "", "no text"
    return kept, model, None


MAX_WORDS = 55
MAX_SENTENCES = 4

# --- no conversation memory -------------------------------------------------
# Every turn uses only what its own request carries, and nothing is kept after
# the reply. /v1/chat takes the earlier turns in `messages` (a LiveKit session
# resends its own chat context every turn; MAX_CHAT_MESSAGES bounds it), and
# /v1/speech is one spoken turn on its own. A `session_id` is still accepted,
# so existing callers keep working, and echoed back; it is never stored and
# gives no memory. This service used to keep each session's recent turns in a
# modal.Dict with no expiry; that store is gone (ROADMAP S2), and a test fails
# if this file uses a Dict again.

app = modal.App("namu-agent")

# --- lockdown ---------------------------------------------------------------
# Modal itself rejects any request that lacks valid Modal-Key / Modal-Secret
# headers, at its edge and BEFORE a container boots, so a stranger who finds
# this URL can neither use the model nor make us pay for a GPU cold start.
# Only Namu's own callers hold the token (the `namu-proxy-auth` Modal secret):
# namu-gateway; namu-agent and namu-interpret, for the services they call; and
# the website's server, for the agent's text step (MODAL_PROXY_KEY/SECRET).
# Callers are deployed before the services they call (platform/README.md,
# step 8). To roll back one service, set this to False and redeploy it alone.
REQUIRE_PROXY_AUTH = True


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
    .pip_install("fastapi[standard]", "requests", "cohere>=5.13")
)

# The persona is the character Air plays: the voice is half of it, the manner
# the other half. Only Nadia is served. "salim" was withdrawn on 2026-10-31 with
# its voice, a clone with no consent record (ROADMAP S3); asking for it, or any
# other unknown persona, is a 400, never a quiet switch to Nadia.
PERSONAS = {
    "nadia": {
        "name": "Nadia",
        "voice": "nadia",
        "style": (
            "Your name is Nadia. You are a woman. You are warm, patient and "
            "encouraging. You explain things gently and simply, as if to "
            "someone you like. You often begin by acknowledging what the "
            "person said before answering."
        ),
        "greeting": "Sannu. Ni ce Nadia. Me zan taimaka maka da shi yau?",
    },
}
DEFAULT_PERSONA = "nadia"


SYSTEM = """You are a friendly, knowledgeable Hausa-speaking assistant. \
You answer questions on any topic: general knowledge, science, history, health, \
travel, technology, religion, farming, business, everyday advice, and more.

ALWAYS reply in Hausa. Never reply in English.

YOUR ANSWER IS READ ALOUD by a speech synthesiser. Write PLAIN SPOKEN PROSE.
Never use Markdown, asterisks, bullet points, numbered lists, or headings.
Never write labels like "Amsa:". Just speak naturally, as a person would.

Keep answers under 55 words — about four short sentences. Finish your thought \
inside that limit; never start a list you cannot finish. Never repeat the same \
point twice.

ANSWER THE QUESTION THAT WAS ASKED. If asked WHEN, give a time. If asked HOW \
MUCH, give a number. If asked WHERE, name the place. If asked WHY or HOW, \
explain the reason simply.

Be concrete and useful rather than vague. If the question is broad, give the \
single most useful answer rather than listing everything.

If you do not know something, say plainly that you are not sure. Never invent \
facts, numbers, dates, or names. For serious medical, legal, or financial \
matters, answer briefly and tell the person to see a qualified professional.

ORTHOGRAPHY IS CRITICAL — the synthesiser reads exactly what you write. Hausa's \
four hooked consonants are SEPARATE PHONEMES, not accents: ɓ (not b), ɗ (not d), \
ƙ (not k), ƴ (not y). Write buɗe not bude, ƙasa not kasa, ƙarfe not karfe, \
ɗaya not daya. Capitalise them as Ɓ Ɗ Ƙ Ƴ at the start of a sentence."""


def system_for(persona: str) -> str:
    """Shared rules first, character last, so the character cannot argue with
    the length cap or the orthography block."""
    p = PERSONAS.get(persona, PERSONAS[DEFAULT_PERSONA])
    return (
        f"{SYSTEM}\n\nWHO YOU ARE\n{p['style']}\n"
        # Without this, models open answers with "Nadia ce." — they take the
        # identity line as an instruction to introduce themselves every turn.
        "This is who you are, not something to say. NEVER announce your name, "
        "and never begin a reply with your own name. Answer the question "
        "directly. Only say your name if you are explicitly asked who you are."
    )


def clean_for_speech(text: str, max_sentences: int = MAX_SENTENCES,
                     max_words: int = MAX_WORDS) -> str:
    """Strip formatting the synthesiser would read aloud, then cap length."""
    import re

    t = re.sub(r"[*_`#]+", " ", text)
    t = re.sub(r"\s+", " ", t).strip()          # collapse to one line FIRST

    # The model emits its formatting on a single line, so line-anchored patterns
    # miss it — match at string start or just after a sentence end. Run twice:
    # stripping a leading "Amsa:" can expose a "1." behind it, and one pass has
    # already moved past that position.
    boundary = r"(?:^|(?<=[.!?])\s*)"
    for _ in range(2):
        t = re.sub(boundary + r"\s*\w{1,12}\s*:\s+", " ", t)   # "Amsa:" labels
        t = re.sub(boundary + r"\s*\d+\s*[.)]\s+", " ", t)     # "1. " / "2) "
        t = re.sub(boundary + r"\s*[-•]\s+", " ", t)           # bullets at start
        t = re.sub(r"\s+[-•]\s+", " ", t)                      # bullets mid-line
        t = re.sub(r"\s+", " ", t).strip()

    parts = [s.strip() for s in re.split(r"(?<=[.!?])\s+", t) if s.strip()]
    if not parts:
        return t

    kept, n = [], 0
    for s in parts[:max_sentences]:
        w = len(s.split())
        if kept and n + w > max_words:
            break
        kept.append(s)
        n += w
    out = " ".join(kept)

    words = out.split()
    if len(words) > max_words:
        out = " ".join(words[:max_words]).rstrip(",;:") + "."
    return out


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("cohere-api-key"),
             modal.Secret.from_name("gemini-api-key"),
             modal.Secret.from_name("openai-api-key"),
             # Always, locked or not: the token is what lets this service call
             # namu-transcribe and namu-voice, which are locked on their own.
             modal.Secret.from_name("namu-proxy-auth")],
    timeout=900,
    scaledown_window=600,
)
@modal.asgi_app(requires_proxy_auth=REQUIRE_PROXY_AUTH)
def api():
    import base64
    import os
    import time

    import cohere
    import requests
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse

    web = FastAPI(title="Namu-Agent", version="1.0",
                  description="Hausa conversational agent.")
    # No CORS on purpose: only Namu's servers call this service, with the proxy
    # token, and that token must never reach a browser.
    KEY = os.environ.get("COHERE_API_KEY")
    OR_KEY = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("GEMINI_API_KEY")
    OA_KEY = os.environ.get("OPENAI_API_KEY")
    co = cohere.ClientV2(KEY) if KEY else None

    def _unknown_persona():
        return JSONResponse({"error": f"unknown persona; use one of: {', '.join(PERSONAS)}"},
                            status_code=400)

    def _chat(messages: list[dict], persona: str,
              model: str = MODEL, meta: dict | None = None) -> tuple[str, str, float]:
        msgs = [{"role": "system", "content": system_for(persona)}] + messages
        t = time.time()
        if provider_for(model) == "openrouter":
            # Qwen3 and friends are hybrid reasoning models: left alone they
            # spend the whole token budget thinking and return content:null.
            # Reasoning is also pure latency here — the reply is four short
            # spoken sentences, not a proof. Models that don't take the switch
            # reject it with a 400, so drop it and retry rather than lose them.
            payload = {"model": model, "temperature": 0.3,
                       "max_tokens": 500, "messages": msgs,
                       "reasoning": {"enabled": False}}
            head = {"Authorization": f"Bearer {OR_KEY}",
                    "Content-Type": "application/json"}
            r = requests.post(OR_URL, headers=head, json=payload, timeout=90)
            if r.status_code == 400:
                payload.pop("reasoning")
                r = requests.post(OR_URL, headers=head, json=payload, timeout=90)
            r.raise_for_status()
            body = r.json()
            if "choices" not in body:            # OpenRouter reports upstream
                raise RuntimeError(str(body)[:300])   # failures in the 200 body
            if meta is not None:
                # Who actually served it, and how many tokens went to thinking
                # — the two things that explain an unexpected latency.
                meta.update({
                    "upstream": body.get("provider"),
                    "usage": body.get("usage"),
                    "finish_reason": body["choices"][0].get("finish_reason"),
                    "reasoning_disabled": "reasoning" in payload,
                })
            msg = body["choices"][0].get("message") or {}
            # Fall back to the reasoning trace rather than crashing on None:
            # a model that ignored the switch still said something usable.
            raw = (msg.get("content") or msg.get("reasoning") or "").strip()
            if not raw:
                raise RuntimeError(f"{model} returned no text "
                                   f"(finish={body['choices'][0].get('finish_reason')})")
        elif provider_for(model) == "openai":
            payload = openai_payload(model, msgs)
            head = {"Authorization": f"Bearer {OA_KEY}",
                    "Content-Type": "application/json"}
            r = requests.post(OPENAI_URL, headers=head, json=payload, timeout=120)
            # Params move between model families; drop whatever this one names
            # as unsupported and retry rather than hard-failing the turn.
            for _ in range(3):
                if r.status_code != 400:
                    break
                bad = ((r.json().get("error") or {}).get("param")
                       or (r.json().get("error") or {}).get("message", ""))
                dropped = next((k for k in ("reasoning_effort", "temperature",
                                            "max_tokens", "max_completion_tokens")
                                if k in str(bad) and k in payload), None)
                if not dropped:
                    break
                payload.pop(dropped)
                r = requests.post(OPENAI_URL, headers=head, json=payload, timeout=120)
            r.raise_for_status()
            body = r.json()
            if meta is not None:
                u = body.get("usage") or {}
                meta.update({
                    "upstream": "OpenAI",
                    "usage": u,
                    "finish_reason": body["choices"][0].get("finish_reason"),
                    "sent": sorted(k for k in payload if k != "messages"),
                })
            raw = (body["choices"][0]["message"].get("content") or "").strip()
            if not raw:
                raise RuntimeError(
                    f"{model} returned no text "
                    f"(finish={body['choices'][0].get('finish_reason')}, "
                    f"usage={body.get('usage')})")
        else:
            resp = co.chat(
                model=model, messages=msgs, temperature=0.3,
                # Hard stop: a small model once ran to 4508 words (67s of
                # synthesis). 55 words of Hausa is well under 200 tokens.
                max_tokens=220,
            )
            raw = "".join(c.text for c in resp.message.content
                          if c.type == "text").strip()
        return clean_for_speech(raw), raw, time.time() - t

    @web.get("/v1/health")
    def health():
        return {"service": "Namu-Agent", "task": "conversational-agent",
                # Derive it — a hardcoded provider silently lies the moment the
                # default model changes, which it did three times in one day.
                "model": MODEL, "provider": provider_for(MODEL),
                "fallback_model": FALLBACK_MODEL, "language": "ha",
                "max_words": MAX_WORDS,
                "personas": {k: {"name": v["name"], "voice": v["voice"],
                                 "greeting": v["greeting"]}
                             for k, v in PERSONAS.items()},
                "default_persona": DEFAULT_PERSONA,
                # Nothing is kept between turns; /v1/chat takes earlier turns in `messages`.
                "memory": {"enabled": False, "stored": False,
                           "scope": "the request's own messages only"},
                "key_configured": bool(KEY)}

    @web.get("/v1/models")
    def models():
        """Which chat models this key can actually reach — so a bad model id is
        one request to diagnose rather than a redeploy to guess at."""
        try:
            r = requests.get("https://api.cohere.com/v1/models?page_size=100",
                             headers={"Authorization": f"Bearer {KEY}"}, timeout=60)
            r.raise_for_status()
            names = sorted(m["name"] for m in r.json().get("models", [])
                           if "chat" in (m.get("endpoints") or []))
            return {"in_use": MODEL, "available_for_chat": names}
        except Exception as e:
            return JSONResponse({"error": f"{type(e).__name__}: {str(e)[:200]}"},
                                status_code=502)

    @web.post("/v1/chat")
    async def chat(request: Request):
        """Text in, text out. `messages` for multi-turn, `text` for one shot.

        Stateless: the model sees this request's messages and nothing else, and
        nothing is kept afterwards. A caller that wants the conversation to
        continue sends its earlier turns in `messages`, as a LiveKit session
        does with its ChatContext. `session_id` is accepted and echoed back for
        callers that still send one; it is not stored and gives no memory.

        `model` must be one of CHAT_MODELS, `persona` one of PERSONAS, and the
        request may carry at most MAX_CHAT_MESSAGES messages of
        MAX_MESSAGE_CHARS each; anything else is a 400 before any provider is
        called.
        """
        try:
            body = await request.json() if await request.body() else {}
        except ValueError:
            return JSONResponse({"error": "the body is not JSON"}, status_code=400)
        messages, model, problem = chat_request(body)
        if problem:
            return JSONResponse({"error": problem}, status_code=400)

        persona = body.get("persona") or DEFAULT_PERSONA
        if persona not in PERSONAS:
            return _unknown_persona()
        session_id = body.get("session_id")
        meta: dict = {}
        try:
            reply, raw, secs = _chat(messages, persona, model, meta)
        except Exception as e:
            return JSONResponse({"error": f"{type(e).__name__}: {str(e)[:200]}"},
                                status_code=502)

        out = {"reply": reply, "raw": raw, "model": model,
               "provider": provider_for(model),
               "persona": persona, "seconds": round(secs, 3),
               "session_id": session_id if isinstance(session_id, str) else None,
               "history_messages": 0}
        if body.get("debug"):
            out["debug"] = meta
        return out

    @web.post("/v1/speech")
    async def speech(request: Request, persona: str = DEFAULT_PERSONA,
                     session_id: str | None = None):
        """Audio in, audio out — the whole turn for non-LiveKit clients.

        One turn on its own: the reply is to this audio alone, and nothing is
        kept. `session_id` is accepted and echoed back; it gives no memory.
        """
        if persona not in PERSONAS:
            return _unknown_persona()
        ct = request.headers.get("content-type", "")
        if ct.startswith("multipart/form-data"):
            form = await request.form()
            upload = form.get("file")
            if upload is None:
                return JSONResponse({"error": "missing 'file' field"},
                                    status_code=400)
            raw_audio = await upload.read()
        else:
            raw_audio = await request.body()
        if not raw_audio:
            return JSONResponse({"error": "empty audio body"}, status_code=400)

        timings = {}
        t = time.time()
        try:
            r = requests.post(f"{TRANSCRIBE_URL}/v1/transcribe", data=raw_audio,
                              headers=_internal_headers({"Content-Type": "application/octet-stream"}),
                              timeout=600)
            r.raise_for_status()
            question = (r.json().get("text") or "").strip()
        except Exception as e:
            return JSONResponse({"error": f"transcribe: {type(e).__name__}: {e}"},
                                status_code=502)
        timings["transcribe"] = round(time.time() - t, 3)
        if not question:
            return JSONResponse({"error": "nothing was heard"}, status_code=422)

        try:
            reply, raw, secs = _chat([{"role": "user", "content": question}], persona)
        except Exception as e:
            return JSONResponse({"error": f"chat: {type(e).__name__}: {e}"},
                                status_code=502)
        timings["chat"] = round(secs, 3)

        t = time.time()
        try:
            r = requests.post(f"{VOICE_URL}/v1/speak", headers=_internal_headers(),
                              json={"text": reply, "language": "ha",
                                    "voice": PERSONAS[persona]["voice"]},
                              timeout=900)
            r.raise_for_status()
            wav = r.content
        except Exception as e:
            return JSONResponse({"error": f"speak: {type(e).__name__}: {e}",
                                 "question": question, "reply": reply},
                                status_code=502)
        timings["speak"] = round(time.time() - t, 3)

        return {"question": question, "reply": reply, "raw": raw,
                "persona": persona, "name": PERSONAS[persona]["name"],
                "audio": base64.b64encode(wav).decode(),
                "sample_rate": 24000, "timings": timings,
                "total_seconds": round(sum(timings.values()), 3),
                "session_id": session_id,
                "history_turns": 0}

    return web
