"""namu-gateway: the one public door to Namu's speech models.

    modal deploy platform/modal/namu_gateway.py

Every developer request lands here. The gateway checks the API key, the
caller's beta status, the key's scopes, the monthly quota and a per-minute
rate limit; measures the audio BEFORE any GPU is touched; forwards the call to
the model service; and records how much was used. The model services behind it
are locked with Modal proxy auth (REQUIRE_PROXY_AUTH in each service), so this
file is the only public way in. (The website's server also calls namu-agent's
text step for the home demo, with the proxy token; see platform/README.md.)

    POST /v1/transcribe   Tatsuniya  speech -> text
    POST /v1/speech       Tafiya     text   -> speech (audio/wav)
    POST /v1/translate    Kora       speech -> translated text (+ speech)
    POST /v1/converse     Air        speech -> spoken reply, with session memory
    GET  /v1/models  /v1/voices  /v1/usage  /v1/health

Keys look like `namu_sk_<43 chars>`. Only HMAC-SHA256(pepper, key) is stored,
by the website when the key is created; the plaintext exists once, in the
developer's hands. Nothing here stores audio or text: usage rows carry seconds,
characters and status codes, never content.

The FastAPI app is built by `create_app(store, upstream, limiter)` so the
security rules can be tested with fakes (platform/tests/test_gateway.py),
without Modal, a database or a GPU.
"""

# No `from __future__ import annotations` here: it turns `request: Request` into
# the string "Request", FastAPI cannot resolve it (Request is imported inside
# create_app), treats `request` as a query parameter, and every route 422s.
import base64
import hashlib
import hmac
import io
import json
import math
import os
import subprocess
import tempfile
import time
import wave
from dataclasses import dataclass, field, replace

import modal

app = modal.App("namu-gateway")

# The gateway itself is public: its @modal.asgi_app() below takes no proxy flag,
# on purpose. It always carries the `namu-proxy-auth` secret, so ModalUpstream
# sends Modal-Key / Modal-Secret to the four model services, which refuse every
# request without them (REQUIRE_PROXY_AUTH in each). Deploy this file before
# them: a service locked before its callers hold the token fails.

UPSTREAM = {
    "transcribe": "https://namu-ai-lab--namu-transcribe-transcribe-api.modal.run",
    "voice": "https://namu-ai-lab--namu-voice-voice-api.modal.run",
    "interpret": "https://namu-ai-lab--namu-interpret-api.modal.run",
    "agent": "https://namu-ai-lab--namu-agent-api.modal.run",
}

SCOPES = ("transcribe", "speech", "translate", "converse")

# Public model names (as on the website) and the voices each one offers.
MODELS = [
    {"id": "tatsuniya", "task": "speech-recognition", "endpoint": "/v1/transcribe",
     "scope": "transcribe", "languages": ["ha"], "status": "beta"},
    {"id": "tafiya", "task": "speech-synthesis", "endpoint": "/v1/speech",
     "scope": "speech", "languages": ["ha", "fr"], "status": "beta"},
    {"id": "kora", "task": "speech-translation", "endpoint": "/v1/translate",
     "scope": "translate", "languages": ["ha", "fr"], "status": "beta"},
    {"id": "air", "task": "conversation", "endpoint": "/v1/converse",
     "scope": "converse", "languages": ["ha"], "status": "research"},
]
# "warm" is the name the website's examples use; it is Nadia.
VOICES = {
    "nadia": {"language": "ha", "upstream": "nadia", "description": "Warm and patient (female)"},
    "salim": {"language": "ha", "upstream": "salim", "description": "Direct and practical (male)"},
    "warm": {"language": "ha", "upstream": "nadia", "description": "Alias of nadia"},
    "fr": {"language": "fr", "upstream": "fr", "description": "French reference voice"},
}
PERSONAS = {"nadia", "salim"}

# Limits. Demo keys are the server-held key behind the website's live demos.
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
MAX_AUDIO_SECONDS = 300.0
MAX_TEXT_CHARS = 2000
DEMO_MAX_AUDIO_SECONDS = 15.0
DEMO_MAX_TEXT_CHARS = 300
DEMO_IP_PER_HOUR = 30
SERVICE_PER_MIN = 20          # the console Playground, per account
KEY_CACHE_TTL = 30.0          # a revoked key stops working within this many seconds

KEY_PREFIX = "namu_sk_"


def hash_key(key: str, pepper: str) -> str:
    """Must match src/lib/keys.ts on the website byte for byte."""
    return hmac.new(pepper.encode(), key.encode(), hashlib.sha256).hexdigest()


# ---------------------------------------------------------------- data shapes
@dataclass
class KeyRecord:
    key_id: str
    user_id: str
    scopes: list[str]
    revoked: bool
    is_demo: bool
    rate_limit_per_min: int
    beta_status: str
    monthly_audio_seconds: float
    used_audio_seconds: float
    is_service: bool = False     # the website's own key: acts only for a signed-in account (X-Namu-Account)


@dataclass
class Usage:
    key_id: str
    user_id: str
    endpoint: str
    model: str
    audio_seconds: float = 0.0
    characters: int = 0
    status: int = 200
    latency_ms: int = 0


@dataclass
class UpstreamReply:
    status: int
    content: bytes
    content_type: str = "application/json"
    meta: dict = field(default_factory=dict)

    def json(self) -> dict:
        return json.loads(self.content)


# ---------------------------------------------------------------- audio helpers
def wav_seconds(data: bytes) -> float:
    with wave.open(io.BytesIO(data)) as w:
        return w.getnframes() / float(w.getframerate())


def sniff_audio(data: bytes) -> str | None:
    """The ffprobe demuxer for an allowed audio container, from its first
    bytes; None for anything else.

    Uploads are untrusted and FFmpeg's demuxers have a long CVE record. Some
    of them (HLS playlists, concat lists) even open other files or URLs, in
    the process that holds the key pepper and the database login. So ffprobe
    never guesses: it gets the one demuxer named here.
    """
    head = data[:12]
    if head[:4] == b"RIFF" and head[8:12] == b"WAVE":
        return "wav"
    if head[:4] == b"OggS":
        return "ogg"
    if head[:4] == b"fLaC":
        return "flac"
    if head[:4] == b"\x1a\x45\xdf\xa3":
        return "matroska"                      # WebM is Matroska
    if head[4:8] == b"ftyp":
        return "mov"                           # MP4, M4A and 3GP share one demuxer
    if head[:3] == b"ID3":
        return "mp3"
    if len(head) >= 2 and head[0] == 0xFF and head[1] & 0xE0 == 0xE0:
        # An MPEG audio frame. Layer bits 00 mean ADTS AAC; anything else is MP3.
        return "aac" if head[1] & 0x06 == 0 else "mp3"
    return None


def probe_seconds(data: bytes) -> float | None:
    """Duration of an allowed audio container; None if the container is not
    allowed, cannot be read, or claims a length that is not a positive,
    finite number of seconds.

    Done before forwarding, so an oversized or garbage upload is refused
    without waking a GPU. The length comes from the file's own header, which
    the caller wrote: a forged negative one would credit the account, and NaN
    slips past every cap.
    """
    secs = header_seconds(data)
    if secs is None or not math.isfinite(secs) or secs <= 0:
        return None
    return secs


def header_seconds(data: bytes) -> float | None:
    """The duration the container declares: WAV by Python's wave module,
    anything else by ffprobe, pinned to the sniffed demuxer."""
    try:
        return wav_seconds(data)
    except Exception:
        pass
    fmt = sniff_audio(data)
    if fmt is None:
        return None
    with tempfile.NamedTemporaryFile(delete=False) as f:
        f.write(data)
        path = f.name
    try:
        # -f: that demuxer and no other. -protocol_whitelist file: the
        # temporary file is the only thing it may open.
        r = subprocess.run(
            ["ffprobe", "-v", "error", "-protocol_whitelist", "file", "-f", fmt,
             "-show_entries", "format=duration", "-of", "default=nw=1:nk=1",
             f"file:{path}"],
            capture_output=True, text=True, timeout=20)
        return float(r.stdout.strip())
    except Exception:
        return None
    finally:
        os.unlink(path)


# ---------------------------------------------------------------- the app
def create_app(store, upstream, limiter, pepper: str, *, audio_seconds=probe_seconds,
               now=time.time):
    """store: lookup(hash)->KeyRecord|None, account(user_id)->(status, monthly_s, used_s)|None, record(Usage)
    upstream: transcribe/speak/translate/converse(...)->UpstreamReply
    limiter: hit(bucket, limit, window_s)->(allowed, retry_after_s)
    """
    import contextvars
    import uuid

    from fastapi import BackgroundTasks, FastAPI, Request
    from fastapi.exceptions import RequestValidationError
    from fastapi.responses import JSONResponse, Response
    from starlette.concurrency import run_in_threadpool as off_loop
    from starlette.exceptions import HTTPException
    # The store and upstream clients are blocking (httpx.Client). Every call to them
    # goes through off_loop, so one slow GPU request never stalls the container.

    web = FastAPI(title="Namu API", version="1.0",
                  description="Speech models for the languages of the Sahel.",
                  docs_url="/docs", redoc_url=None)
    cache: dict[str, tuple[float, KeyRecord]] = {}
    request_id = contextvars.ContextVar("request_id", default="")

    def err(status: int, kind: str, message: str, headers: dict | None = None):
        body = {"type": kind, "message": message}
        if request_id.get():
            body["request_id"] = request_id.get()
        return JSONResponse({"error": body}, status_code=status, headers=headers)

    # ------------------------------------------------------------ one envelope for every answer
    # Every response carries X-Request-Id, and every error repeats it, so a developer's report can be
    # matched to the gateway's logs. The id is made here, never taken from the caller.
    @web.middleware("http")
    async def tag_request(request: Request, call_next):
        rid = uuid.uuid4().hex
        request_id.set(rid)
        response = await call_next(request)
        response.headers["X-Request-Id"] = rid
        return response

    # FastAPI's own 404, 405 and 422 answers, and anything unhandled, would otherwise
    # bypass { error: { type, message } } and break SDK code that reads error.type.
    @web.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        kind, message = {
            404: ("not_found", "No such endpoint. The API is under /v1; see /docs."),
            405: ("method_not_allowed", f"{request.method} is not allowed on {request.url.path}."),
        }.get(exc.status_code, ("http_error", str(exc.detail)))
        return err(exc.status_code, kind, message, getattr(exc, "headers", None))

    @web.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, exc: RequestValidationError):
        return err(400, "invalid_request", "The request does not have the shape this endpoint takes; see /docs.")

    @web.exception_handler(Exception)
    async def internal_error(request: Request, exc: Exception):
        # Outside the middleware above, so the id goes on here; the details stay in the log.
        print(f"unhandled {type(exc).__name__} on {request.method} {request.url.path} "
              f"[{request_id.get()}]", flush=True)
        return err(500, "internal_error", "Something went wrong on our side. Try again; if it persists, "
                   "write to contact@namuai.org with the request id.", {"X-Request-Id": request_id.get()})

    def presented_key(request: Request) -> str | None:
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            return auth[7:].strip()
        return request.headers.get("x-namu-key")

    async def authorize(request: Request, scope: str):
        """-> (KeyRecord, None) or (None, error response)."""
        key = presented_key(request)
        if not key:
            return None, err(401, "missing_api_key",
                             "Send your key as 'Authorization: Bearer namu_sk_...'.")
        if not key.startswith(KEY_PREFIX) or len(key) > 128:
            return None, err(401, "invalid_api_key", "That is not a Namu API key.")
        h = hash_key(key, pepper)
        hit = cache.get(h)
        rec = hit[1] if hit and now() - hit[0] < KEY_CACHE_TTL else None
        if rec is None:
            try:
                rec = await off_loop(store.lookup, h)
            except Exception as e:
                print(f"key lookup failed: {type(e).__name__}", flush=True)
                return None, err(503, "auth_unavailable",
                                 "Key verification is temporarily unavailable. Try again shortly.")
            if rec is None:
                return None, err(401, "invalid_api_key", "Unknown API key.")
            cache[h] = (now(), rec)
        if rec.revoked:
            return None, err(401, "key_revoked", "This API key has been revoked.")
        bucket, limit = f"key:{rec.key_id}", rec.rate_limit_per_min
        if rec.is_service:
            # The website's console Playground: the site has already signed the developer in, and names
            # their account here. The request then runs as that account: its status, its allowance, its
            # usage; and a service key is refused without one.
            acct = (request.headers.get("x-namu-account") or "").strip()
            if not acct or len(acct) > 64:
                return None, err(403, "account_required", "This key acts only for a signed-in account.")
            try:
                a = await off_loop(store.account, acct)
            except Exception as e:
                print(f"account lookup failed: {type(e).__name__}", flush=True)
                return None, err(503, "auth_unavailable",
                                 "Key verification is temporarily unavailable. Try again shortly.")
            if a is None:
                return None, err(403, "unknown_account", "Unknown account.")
            rec = replace(rec, user_id=acct, beta_status=a[0], monthly_audio_seconds=float(a[1]),
                          used_audio_seconds=float(a[2]))
            bucket, limit = f"acct:{acct}", SERVICE_PER_MIN
        if rec.beta_status != "approved":
            return None, err(403, "account_paused",
                             "This account is paused. Write to contact@namuai.org.")
        if scope not in rec.scopes:
            return None, err(403, "insufficient_scope",
                             f"This key is not allowed to call '{scope}'.")
        if rec.used_audio_seconds >= rec.monthly_audio_seconds:
            return None, err(429, "quota_exceeded",
                             "This account has used its monthly audio allowance.")
        ok, retry = await off_loop(limiter.hit, bucket, limit, 60)
        if not ok:
            return None, err(429, "rate_limited", "Too many requests for this key.",
                             {"Retry-After": str(retry)})
        if rec.is_demo:
            # Only demo keys may name an end-user IP: the website's demo route
            # sets it, and it is what keeps one visitor from draining the demo.
            ip = request.headers.get("x-namu-client-ip") or "unknown"
            ok, retry = await off_loop(limiter.hit, f"demo-ip:{ip}", DEMO_IP_PER_HOUR, 3600)
            if not ok:
                return None, err(429, "rate_limited",
                                 "Demo limit reached. Create an account for more.",
                                 {"Retry-After": str(retry)})
        return rec, None

    async def read_audio(request: Request, rec: KeyRecord):
        """-> (bytes, seconds, fields, None) or (None, None, None, error)."""
        ct = request.headers.get("content-type", "")
        fields: dict[str, str] = {}
        if ct.startswith("multipart/form-data"):
            form = await request.form()
            upload = form.get("file")
            if upload is None or isinstance(upload, str):
                return None, None, None, err(400, "missing_file",
                                             "Send the audio as a multipart field named 'file'.")
            data = await upload.read()
            fields = {k: v for k, v in form.items() if isinstance(v, str)}
        else:
            data = await request.body()
            fields = dict(request.query_params)
        if not data:
            return None, None, None, err(400, "empty_audio", "The audio was empty.")
        if len(data) > MAX_UPLOAD_BYTES:
            return None, None, None, err(413, "payload_too_large",
                                         "Audio must be 25 MB or smaller.")
        secs = await off_loop(audio_seconds, data)
        if secs is None:
            return None, None, None, err(415, "unsupported_audio",
                                         "Could not read that audio. Send WAV, MP3, M4A, AAC, OGG, WebM or FLAC.")
        limit = DEMO_MAX_AUDIO_SECONDS if rec.is_demo else MAX_AUDIO_SECONDS
        if secs > limit:
            return None, None, None, err(413, "audio_too_long",
                                         f"Audio must be {int(limit)} seconds or shorter.")
        return data, secs, fields, None

    def record(bg: BackgroundTasks, rec: KeyRecord, endpoint: str, model: str,
               t0: float, status: int, seconds: float = 0.0, chars: int = 0):
        rec.used_audio_seconds += seconds      # keep the cached quota honest
        bg.add_task(store.record, Usage(rec.key_id, rec.user_id, endpoint, model,
                                        round(seconds, 3), chars, status,
                                        int((now() - t0) * 1000)))

    def upstream_failed(reply: UpstreamReply):
        return err(502, "upstream_error",
                   "The model service did not answer. Try again in a moment.")

    # ------------------------------------------------------------ endpoints
    @web.get("/v1/health")
    def health():
        return {"service": "namu-api", "status": "ok", "models": [m["id"] for m in MODELS]}

    @web.get("/v1/models")
    def models():
        return {"data": MODELS}

    @web.get("/v1/voices")
    def voices():
        return {"data": [{"id": k, "language": v["language"], "description": v["description"]}
                         for k, v in VOICES.items()]}

    @web.get("/v1/usage")
    async def usage(request: Request):
        key = presented_key(request)
        if not key:
            return err(401, "missing_api_key", "Send your API key.")
        try:
            rec = await off_loop(store.lookup, hash_key(key, pepper))
        except Exception as e:
            print(f"key lookup failed: {type(e).__name__}", flush=True)
            return err(503, "auth_unavailable", "Key verification is temporarily unavailable.")
        if rec is None or rec.revoked:
            return err(401, "invalid_api_key", "Unknown or revoked API key.")
        if rec.is_service:                     # as everywhere: the service key speaks only for a named account
            acct = (request.headers.get("x-namu-account") or "").strip()
            a = await off_loop(store.account, acct) if acct and len(acct) <= 64 else None
            if a is None:
                return err(403, "account_required", "This key acts only for a signed-in account.")
            return {"month_audio_seconds_used": round(float(a[2]), 1), "month_audio_seconds_limit": float(a[1])}
        return {"month_audio_seconds_used": round(rec.used_audio_seconds, 1),
                "month_audio_seconds_limit": rec.monthly_audio_seconds}

    @web.post("/v1/transcribe")
    async def transcribe(request: Request, bg: BackgroundTasks):
        t0 = now()
        rec, e = await authorize(request, "transcribe")
        if e:
            return e
        data, secs, fields, e = await read_audio(request, rec)
        if e:
            return e
        language = fields.get("language", "ha")
        if language != "ha":
            return err(400, "unsupported_language", "Tatsuniya transcribes Hausa ('ha').")
        reply = await off_loop(upstream.transcribe, data, language)
        if reply.status != 200:
            record(bg, rec, "transcribe", "tatsuniya", t0, 502)
            return upstream_failed(reply)
        out = reply.json()
        record(bg, rec, "transcribe", "tatsuniya", t0, 200, secs)
        return {"model": "tatsuniya", "text": out.get("text", ""),
                "language": language, "audio_seconds": round(secs, 2)}

    @web.post("/v1/speech")
    async def speech(request: Request, bg: BackgroundTasks):
        t0 = now()
        rec, e = await authorize(request, "speech")
        if e:
            return e
        try:
            body = await request.json()
        except Exception:
            return err(400, "invalid_json", 'Send JSON: {"text": "...", "voice": "nadia"}.')
        text = (body.get("text") or "").strip()
        if not text:
            return err(400, "missing_text", "'text' is required.")
        cap = DEMO_MAX_TEXT_CHARS if rec.is_demo else MAX_TEXT_CHARS
        if len(text) > cap:
            return err(413, "text_too_long", f"'text' must be {cap} characters or fewer.")
        voice = body.get("voice") or "nadia"
        if voice not in VOICES:
            return err(400, "unknown_voice", f"Unknown voice. Try one of: {', '.join(VOICES)}.")
        v = VOICES[voice]
        reply = await off_loop(upstream.speak, text, v["language"], v["upstream"])
        if reply.status != 200 or not reply.content_type.startswith("audio"):
            record(bg, rec, "speech", "tafiya", t0, 502, chars=len(text))
            return upstream_failed(reply)
        try:
            secs = wav_seconds(reply.content)
        except Exception:
            secs = 0.0
        record(bg, rec, "speech", "tafiya", t0, 200, secs, len(text))
        if body.get("format") == "json":
            return {"model": "tafiya", "voice": voice, "audio_seconds": round(secs, 2),
                    "audio": base64.b64encode(reply.content).decode(), "sample_rate": 24000}
        return Response(reply.content, media_type="audio/wav",
                        headers={"X-Audio-Seconds": f"{secs:.2f}"})

    @web.post("/v1/translate")
    async def translate(request: Request, bg: BackgroundTasks):
        t0 = now()
        rec, e = await authorize(request, "translate")
        if e:
            return e
        data, secs, fields, e = await read_audio(request, rec)
        if e:
            return e
        target = fields.get("target", "fr")
        source = fields.get("source") or ("ha" if target == "fr" else "fr")
        if {source, target} != {"ha", "fr"}:
            return err(400, "unsupported_pair", "Kora translates between Hausa and French.")
        reply = await off_loop(upstream.translate, data, source, target)
        if reply.status != 200:
            record(bg, rec, "translate", "kora", t0, 502, secs)
            return upstream_failed(reply)
        out = reply.json()
        record(bg, rec, "translate", "kora", t0, 200, secs)
        res = {"model": "kora", "source": source, "target": target,
               "source_text": out.get("source_text", ""), "text": out.get("target_text", ""),
               "audio_seconds": round(secs, 2)}
        if str(fields.get("include_audio", "")).lower() in ("1", "true", "yes"):
            res["audio"] = out.get("audio")
        return res

    @web.post("/v1/converse")
    async def converse(request: Request, bg: BackgroundTasks):
        t0 = now()
        rec, e = await authorize(request, "converse")
        if e:
            return e
        data, secs, fields, e = await read_audio(request, rec)
        if e:
            return e
        persona = fields.get("persona", "nadia")
        if persona not in PERSONAS:
            return err(400, "unknown_persona", "persona must be 'nadia' or 'salim'.")
        client_sid = (fields.get("session_id") or "")[:100] or None
        # Namespaced by account: one developer can never read or extend
        # another developer's conversation by guessing a session id.
        sid = f"{rec.user_id}:{client_sid}" if client_sid else None
        reply = await off_loop(upstream.converse, data, persona, sid)
        if reply.status != 200:
            record(bg, rec, "converse", "air", t0, 502, secs)
            return upstream_failed(reply)
        out = reply.json()
        try:
            out_secs = wav_seconds(base64.b64decode(out.get("audio") or ""))
        except Exception:
            out_secs = 0.0
        record(bg, rec, "converse", "air", t0, 200, secs + out_secs)
        return {"model": "air", "persona": persona, "session_id": client_sid,
                "heard": out.get("question", ""), "reply": out.get("reply", ""),
                "audio": out.get("audio"), "sample_rate": 24000,
                "audio_seconds": round(secs + out_secs, 2)}

    return web


# ---------------------------------------------------------------- real backends
class PostgresStore:
    """Keys and usage in Neon Postgres, through two SECURITY DEFINER functions
    (db/migrations/0001_namu_api.sql). The connection uses the namu_gateway role,
    which may call those two functions and nothing else."""

    def __init__(self, url: str):
        from psycopg_pool import ConnectionPool

        # prepare_threshold=None: no server-side prepared statements, so Neon's
        # pooled (PgBouncer) endpoint is safe to use. Neon suspends an idle database
        # and drops its connections, so each one is checked before use, and idle ones
        # are retired well before that happens.
        self.pool = ConnectionPool(url, min_size=1, max_size=4, open=True, max_idle=120,
                                   check=ConnectionPool.check_connection,
                                   kwargs={"prepare_threshold": None, "connect_timeout": 15})

    def _one(self, sql: str, args: tuple):
        import psycopg

        for attempt in (1, 2):                 # one retry: a dropped connection is not an outage
            try:
                with self.pool.connection() as c:
                    return c.execute(sql, args).fetchone()
            except psycopg.OperationalError:
                if attempt == 2:
                    raise

    def lookup(self, key_hash: str) -> KeyRecord | None:
        x = self._one("select key_id, user_id, scopes, revoked, is_demo, rate_limit_per_min, "
                      "beta_status, monthly_audio_seconds, used_audio_seconds, is_service "
                      "from public.namu_key_lookup_v2(%s::text)", (key_hash,))
        if x is None:
            return None
        return KeyRecord(str(x[0]), x[1], list(x[2] or []), bool(x[3]), bool(x[4]), int(x[5]),
                         x[6], float(x[7]), float(x[8]), bool(x[9]))

    def account(self, user_id: str) -> tuple[str, float, float] | None:
        x = self._one("select beta_status, monthly_audio_seconds, used_audio_seconds "
                      "from public.namu_account_lookup(%s::text)", (user_id,))
        return (x[0], float(x[1]), float(x[2])) if x else None

    def record(self, u: Usage) -> None:
        try:
            self._one("select public.namu_record_usage(%s::uuid, %s::text, %s::text, %s::text, "
                      "%s::numeric, %s::int, %s::int, %s::int)",
                      (u.key_id, u.user_id, u.endpoint, u.model, u.audio_seconds,
                       u.characters, u.status, u.latency_ms))
        except Exception as e:                 # metering must never fail a request
            print(f"usage record failed: {type(e).__name__}", flush=True)


class ModalUpstream:
    """The four model services, called with Modal proxy-auth headers."""

    def __init__(self, urls: dict, proxy_key: str | None, proxy_secret: str | None):
        import httpx

        h = {}
        if proxy_key and proxy_secret:
            h = {"Modal-Key": proxy_key, "Modal-Secret": proxy_secret}
        self.urls = urls
        self.http = httpx.Client(timeout=900, headers=h)

    def _reply(self, r) -> UpstreamReply:
        return UpstreamReply(r.status_code, r.content, r.headers.get("content-type", ""))

    def transcribe(self, data: bytes, language: str) -> UpstreamReply:
        return self._reply(self.http.post(
            f"{self.urls['transcribe']}/v1/transcribe", params={"language": language},
            content=data, headers={"Content-Type": "application/octet-stream"}))

    def speak(self, text: str, language: str, voice: str) -> UpstreamReply:
        return self._reply(self.http.post(
            f"{self.urls['voice']}/v1/speak",
            json={"text": text, "language": language, "voice": voice}))

    def translate(self, data: bytes, source: str, target: str) -> UpstreamReply:
        return self._reply(self.http.post(
            f"{self.urls['interpret']}/v1/speech", params={"source": source, "target": target},
            content=data, headers={"Content-Type": "application/octet-stream"}))

    def converse(self, data: bytes, persona: str, session_id: str | None) -> UpstreamReply:
        params = {"persona": persona}
        if session_id:
            params["session_id"] = session_id
        return self._reply(self.http.post(
            f"{self.urls['agent']}/v1/speech", params=params, content=data,
            headers={"Content-Type": "application/octet-stream"}))


class DictLimiter:
    """Fixed-window counters in a modal.Dict, shared by every gateway container.

    Read-then-write is not atomic, so two containers can each let one extra
    request through at a window boundary. Acceptable for abuse control; this
    is not a billing meter (usage_events is).
    """

    def __init__(self, d):
        self.d = d

    def hit(self, bucket: str, limit: int, window_s: int) -> tuple[bool, int]:
        t = int(time.time())
        win = t // window_s
        k = f"{bucket}:{win}"
        n = (self.d.get(k) or 0) + 1
        self.d.put(k, n)
        if n > limit:
            return False, (win + 1) * window_s - t
        return True, 0


image = (
    modal.Image.debian_slim(python_version="3.11")
    # ffprobe: audio length before any GPU work. It parses untrusted uploads, so
    # rebuild the image now and then to take Debian's security fixes: Modal
    # caches this layer until forced (MODAL_FORCE_BUILD=1, platform/README.md).
    .apt_install("ffmpeg")
    .pip_install("fastapi[standard]", "httpx", "psycopg[binary]==3.2.13", "psycopg-pool==3.2.8")
)


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("namu-db"),
             modal.Secret.from_name("namu-key-pepper"),
             modal.Secret.from_name("namu-proxy-auth")],
    min_containers=1,                          # the front door should never cold-start
    max_containers=4,
    timeout=900,
    scaledown_window=600,
)
@modal.asgi_app()
def api():
    store = PostgresStore(os.environ["GATEWAY_DATABASE_URL"])
    upstream = ModalUpstream(UPSTREAM, os.environ.get("MODAL_PROXY_KEY"),
                             os.environ.get("MODAL_PROXY_SECRET"))
    limiter = DictLimiter(modal.Dict.from_name("namu-gateway-ratelimit", create_if_missing=True))
    return create_app(store, upstream, limiter, os.environ["NAMU_KEY_PEPPER"])
