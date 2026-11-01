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
    POST /v1/speech       Tafiya     text   -> speech (WAV, MP3 or Ogg Opus)
    POST /v1/translate    Kora       speech or text -> translated text (+ speech)
    POST /v1/converse     Air        speech -> spoken reply, one turn, nothing kept
    GET  /v1/models  /v1/voices  /v1/usage  /v1/health

Keys look like `namu_sk_<43 chars>`. Only HMAC-SHA256(pepper, key) is stored,
by the website when the key is created; the plaintext exists once, in the
developer's hands. Nothing here stores audio or text: usage rows carry seconds,
characters and status codes, never content, and converse keeps no conversation
between calls.

The FastAPI app is built by `create_app(store, upstream, limiter)` so the
security rules can be tested with fakes (platform/tests/test_gateway.py),
without Modal, a database or a GPU. The same app runs on AWS behind the API's
own hostname (platform/aws/gateway): there `modal` is not installed, the Modal
entry point below is skipped, and MemoryLimiter replaces DictLimiter.
"""

# No `from __future__ import annotations` here: it turns `request: Request` into
# the string "Request", FastAPI cannot resolve it (Request is imported inside
# create_app), treats `request` as a query parameter, and every route 422s.
import base64
import hashlib
import hmac
import io
import ipaddress
import json
import math
import os
import random
import subprocess
import tempfile
import time
import wave
from dataclasses import dataclass, field, replace

try:
    import modal
except ImportError:                            # the AWS container (platform/aws/gateway) has no Modal
    modal = None

app = modal.App("namu-gateway") if modal else None

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
     "scope": "speech", "languages": ["ha"], "status": "beta"},
    {"id": "kora", "task": "speech-translation", "endpoint": "/v1/translate",
     "scope": "translate", "languages": ["ha", "fr"], "status": "beta"},
    {"id": "air", "task": "conversation", "endpoint": "/v1/converse",
     "scope": "converse", "languages": ["ha"], "status": "research"},
]
# The voices and Air personas the API serves. "warm" is the name the website's examples use; it is Nadia.
# Withdrawn on 2026-10-31 (ROADMAP S3), with no consent record for either speaker: "salim", a cloned Hausa voice
# (and Air's persona of that name), and "fr", the French reference voice. A request naming one is refused with 400
# like any unknown voice or persona; nothing falls back to another voice. The website keeps the same two lists in
# src/lib/voices.ts, and test_gateway.py checks that they agree.
VOICES = {
    "nadia": {"language": "ha", "upstream": "nadia", "description": "Warm and patient (female)"},
    "warm": {"language": "ha", "upstream": "nadia", "description": "Alias of nadia"},
}
PERSONAS = ("nadia",)
# Translate speaks its translation only in these languages. French speech went with the fr voice, so a French
# translation is text: "audio" is null when include_audio asks for it.
SPOKEN_TARGETS = ("ha",)

# Limits. Demo keys are the server-held key behind the website's live demos.
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
MULTIPART_SLACK_BYTES = 1024 * 1024           # room for the multipart framing and the form's text fields
MAX_AUDIO_SECONDS = 300.0
MAX_TEXT_CHARS = 2000
TEXT_CHARS_PER_SECOND = 15.0   # text translation is counted as speech of its length: about 15 characters a second
DEMO_MAX_AUDIO_SECONDS = 15.0
DEMO_MAX_TEXT_CHARS = 300
DEMO_IP_PER_HOUR = 30
SERVICE_PER_MIN = 20          # the console Playground, per account
KEY_CACHE_TTL = 30.0          # a revoked key stops working within this many seconds
# Keys that are not in the cache cost a database lookup. A caller address may cause this many a
# minute (per container), and an unknown key is remembered for KEY_CACHE_TTL like a known one, so
# a flood of made-up keys is answered from memory instead of from Postgres.
KEY_LOOKUPS_PER_ADDRESS_PER_MIN = 60
UNKNOWN_KEYS_REMEMBERED = 10_000  # bounds that memory: past it, the list is forgotten and refilled

# How long the gateway waits for a model, in total, by who is asking. The website's demo and
# Playground routes give up after 100-110 s and 290 s (src/app/api/demo, src/app/api/playground);
# answering a little earlier turns their abort into the API's own 504, which counts nothing.
# Developers' own calls get most of the gateway's 900 s function timeout.
UPSTREAM_TIMEOUT_S = {"demo": 95.0, "playground": 280.0, "api": 840.0}
CONNECT_TIMEOUT_S = 10.0

# Requests one gateway container serves at once (@modal.concurrent). Modal's default is one, which
# made four slow calls, across four containers, an outage for everyone. A request spends nearly all
# its time waiting for a model in a worker thread (off_loop), and the thread pool holds 40 threads,
# shared with usage writes, so 32 leaves room. The database pool and the HTTP client are sized to it.
MAX_INPUTS = 32

KEY_PREFIX = "namu_sk_"


def hash_key(key: str, pepper: str) -> str:
    """Must match src/lib/keys.ts on the website byte for byte."""
    return hmac.new(pepper.encode(), key.encode(), hashlib.sha256).hexdigest()


def billable_seconds(endpoint: str, status: int, sent_s: float = 0.0, returned_s: float = 0.0) -> float:
    """The audio seconds one request counts against the monthly allowance: the one rule, in one place.

    A request that did not succeed counts nothing, whatever failed: the docs say a 502 or 504 is safe
    to retry, and a retry must not be charged twice. A success counts
        transcribe  the audio sent
        speech      the audio returned
        translate   the audio sent; not the translated speech it can return, until the open billing
                    question in platform/README.md is decided
        translate_text  a written request: its text counted as the time it takes to say
                    (TEXT_CHARS_PER_SECOND), plus the translation spoken, when it was asked for
        converse    the audio sent and the spoken reply
    """
    if not 200 <= status < 300:
        return 0.0
    counted = {"transcribe": sent_s, "speech": returned_s, "translate": sent_s,
               "translate_text": sent_s + returned_s,
               "converse": sent_s + returned_s}[endpoint]
    return max(0.0, counted)                   # a length is never a credit, however it was measured


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


class UpstreamTimeout(TimeoutError):
    """A model service did not answer within the caller's budget (UPSTREAM_TIMEOUT_S): a 504."""


def address_bucket(host: str | None) -> str:
    """Who a per-address limit counts: the IPv4 address, or the IPv6 /64, which one customer
    usually holds whole (a limit per IPv6 address would be no limit). Takes an address, or a
    network that was already narrowed (the website's demo routes send an IPv6 visitor as its /64);
    either way the answer is the same string for every address in one /64."""
    try:
        ip = ipaddress.ip_address(host or "")
    except ValueError:
        try:
            ip = ipaddress.ip_network(host or "", strict=False).network_address
        except ValueError:
            return host or "unknown"
    if ip.version == 6 and ip.ipv4_mapped:     # ::ffff:a.b.c.d is an IPv4 caller on a dual-stack socket
        ip = ip.ipv4_mapped
    if ip.version == 6:
        return str(ipaddress.ip_network(f"{ip}/64", strict=False))
    return str(ip)


class WindowCounter:
    """Fixed-window counters in this container's memory, for limits where answering without a
    network call matters more than counting exactly across containers. Same hit() as DictLimiter.
    Bounded: when it holds too many buckets it forgets them all, which at worst lets a few
    requests through."""

    def __init__(self, now=time.time, max_buckets: int = 10_000):
        self.now, self.max_buckets = now, max_buckets
        self.counts: dict[tuple[str, int], int] = {}

    def hit(self, bucket: str, limit: int, window_s: int) -> tuple[bool, int]:
        t = int(self.now())
        win = t // window_s
        if len(self.counts) >= self.max_buckets:
            self.counts.clear()
        n = self.counts.get((bucket, win), 0) + 1
        self.counts[(bucket, win)] = n
        if n > limit:
            return False, (win + 1) * window_s - t
        return True, 0


def upstream_budget(rec: KeyRecord) -> float:
    """Seconds to wait for a model on this key's behalf."""
    if rec.is_demo:
        return UPSTREAM_TIMEOUT_S["demo"]
    if rec.is_service:
        return UPSTREAM_TIMEOUT_S["playground"]
    return UPSTREAM_TIMEOUT_S["api"]


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


# What /v1/speech can answer, by "format": the model's own WAV, or the same speech encoded for where it will
# be heard (MP3 for files and players, Ogg Opus for WhatsApp voice notes). "json" is WAV in base64.
SPEECH_FORMATS = {"wav": "audio/wav", "mp3": "audio/mpeg", "opus": "audio/ogg"}
ENCODE_ARGS = {"mp3": ["-c:a", "libmp3lame", "-b:a", "64k", "-ac", "1", "-f", "mp3"],
               "opus": ["-c:a", "libopus", "-b:a", "32k", "-ar", "48000", "-ac", "1", "-application", "voip", "-f", "ogg"]}


def encode_audio(data: bytes, fmt: str) -> bytes | None:
    """The model's WAV in another format, by ffmpeg; None if it fails. The input is the voice service's
    own output, but ffmpeg is still pinned to the WAV demuxer and to the one temporary file, as ffprobe is."""
    if fmt not in ENCODE_ARGS:
        return None
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as f:
        f.write(data)
        path = f.name
    try:
        r = subprocess.run(
            ["ffmpeg", "-v", "error", "-protocol_whitelist", "file,pipe", "-f", "wav", "-i", f"file:{path}",
             *ENCODE_ARGS[fmt], "pipe:1"],
            capture_output=True, timeout=60)
        return r.stdout if r.returncode == 0 and r.stdout else None
    except Exception:
        return None
    finally:
        os.unlink(path)


# ---------------------------------------------------------------- the app
def create_app(store, upstream, limiter, pepper: str, *, audio_seconds=probe_seconds,
               encode=encode_audio, now=time.time):
    """store: lookup(hash)->KeyRecord|None, account(user_id)->(status, monthly_s, used_s)|None, record(Usage)
    upstream: transcribe/speak/translate/translate_text/converse(..., timeout_s)->UpstreamReply; may raise,
              and raises TimeoutError (UpstreamTimeout) when the time runs out
    encode: (wav_bytes, "mp3" | "opus") -> bytes | None, for /v1/speech's format
    limiter: hit(bucket, limit, window_s)->(allowed, retry_after_s)
    """
    import contextvars
    import uuid

    from fastapi import BackgroundTasks, FastAPI, Request
    from fastapi.exceptions import RequestValidationError
    from fastapi.responses import JSONResponse, Response
    from starlette.concurrency import run_in_threadpool as off_loop
    from starlette.exceptions import HTTPException
    # The store and upstream clients are blocking (httpx.Client, psycopg). Every call to them goes
    # through off_loop, a worker thread, so while one request waits minutes for a GPU the event loop
    # keeps serving the container's other requests (MAX_INPUTS of them).

    web = FastAPI(title="Namu API", version="1.0",
                  description="Speech models for the languages of the Sahel.",
                  docs_url="/docs", redoc_url=None)
    cache: dict[str, tuple[float, KeyRecord]] = {}
    unknown: dict[str, float] = {}             # key hashes the database did not know, and when
    lookups = WindowCounter(now)               # database key lookups per caller address
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
            # Starlette's own 400: a multipart body it could not parse
            400: ("invalid_request", f"The request body could not be read: {exc.detail}"),
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

    async def known_key(request: Request, h: str):
        """The record for a key hash: from memory when it was looked up in the last KEY_CACHE_TTL
        seconds, known or not; otherwise from the database, within the caller address's lookups.
        -> (KeyRecord, None) or (None, error response)."""
        hit = cache.get(h)
        if hit and now() - hit[0] < KEY_CACHE_TTL:
            return hit[1], None
        if now() - unknown.get(h, float("-inf")) < KEY_CACHE_TTL:
            return None, err(401, "invalid_api_key", "Unknown API key.")
        ok, retry = lookups.hit(f"lookup:{address_bucket(request.client.host if request.client else None)}",
                                KEY_LOOKUPS_PER_ADDRESS_PER_MIN, 60)
        if not ok:
            return None, err(429, "rate_limited", "Too many unknown keys from this address. Wait, then "
                             "check the key.", {"Retry-After": str(retry)})
        try:
            rec = await off_loop(store.lookup, h)
        except Exception as e:
            print(f"key lookup failed: {type(e).__name__}", flush=True)
            return None, err(503, "auth_unavailable",
                             "Key verification is temporarily unavailable. Try again shortly.")
        if rec is None:
            if len(unknown) >= UNKNOWN_KEYS_REMEMBERED:
                unknown.clear()
            unknown[h] = now()
            return None, err(401, "invalid_api_key", "Unknown API key.")
        cache[h] = (now(), rec)
        return rec, None

    async def identify(request: Request):
        """The checks every keyed endpoint shares, /v1/usage included: a key is present, well formed,
        known and not revoked; the service key names an account; the account is not paused.
        -> (KeyRecord, None) or (None, error response)."""
        key = presented_key(request)
        if not key:
            return None, err(401, "missing_api_key",
                             "Send your key as 'Authorization: Bearer namu_sk_...'.")
        if not key.startswith(KEY_PREFIX) or len(key) > 128:
            return None, err(401, "invalid_api_key", "That is not a Namu API key.")
        rec, e = await known_key(request, hash_key(key, pepper))
        if e:
            return None, e
        if rec.revoked:
            return None, err(401, "key_revoked", "This API key has been revoked.")
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
        if rec.beta_status != "approved":
            return None, err(403, "account_paused",
                             "This account is paused. Write to contact@namuai.org.")
        return rec, None

    async def authorize(request: Request, scope: str):
        """identify(), then what calling a model needs: the scope, allowance left, the rate limits.
        -> (KeyRecord, None) or (None, error response)."""
        rec, e = await identify(request)
        if e:
            return None, e
        if scope not in rec.scopes:
            return None, err(403, "insufficient_scope",
                             f"This key is not allowed to call '{scope}'.")
        if rec.used_audio_seconds >= rec.monthly_audio_seconds:
            return None, err(429, "quota_exceeded",
                             "This account has used its monthly audio allowance.")
        if rec.is_service:                     # the Playground: per account, not per key
            bucket, limit = f"acct:{rec.user_id}", SERVICE_PER_MIN
        else:
            bucket, limit = f"key:{rec.key_id}", rec.rate_limit_per_min
        ok, retry = await off_loop(limiter.hit, bucket, limit, 60)
        if not ok:
            return None, err(429, "rate_limited", "Too many requests for this key.",
                             {"Retry-After": str(retry)})
        if rec.is_demo:
            # Only demo keys may name an end-user IP: the website's demo route
            # sets it, and it is what keeps one visitor from draining the demo.
            # Counted per IPv4 address or per IPv6 /64: one host holds a whole
            # /64, and could otherwise take a fresh address for every request.
            ip = address_bucket(request.headers.get("x-namu-client-ip") or "unknown")
            ok, retry = await off_loop(limiter.hit, f"demo-ip:{ip}", DEMO_IP_PER_HOUR, 3600)
            if not ok:
                return None, err(429, "rate_limited",
                                 "Demo limit reached. Create an account for more.",
                                 {"Retry-After": str(retry)})
        return rec, None

    async def read_capped(request: Request) -> bytes | None:
        """A raw body, read no further than MAX_UPLOAD_BYTES; None if it is longer."""
        chunks, size = [], 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                return None
            chunks.append(chunk)
        return b"".join(chunks)

    async def read_audio(request: Request, rec: KeyRecord):
        """-> (bytes, seconds, fields, None) or (None, None, None, error).

        An oversized upload is refused before it is read into memory, which MAX_INPUTS requests
        share: by its declared length, by the size of the spooled multipart file, or as a raw body
        is streamed in.
        """
        too_big = err(413, "payload_too_large", "Audio must be 25 MB or smaller.")
        declared = request.headers.get("content-length", "")
        if declared.isdigit() and int(declared) > MAX_UPLOAD_BYTES + MULTIPART_SLACK_BYTES:
            return None, None, None, too_big
        ct = request.headers.get("content-type", "")
        fields: dict[str, str] = {}
        if ct.startswith("multipart/form-data"):
            form = await request.form()            # Starlette spools file parts to disk past 1 MB
            upload = form.get("file")
            if upload is None or isinstance(upload, str):
                return None, None, None, err(400, "missing_file",
                                             "Send the audio as a multipart field named 'file'.")
            if (upload.size or 0) > MAX_UPLOAD_BYTES:
                return None, None, None, too_big
            data = await upload.read()
            fields = {k: v for k, v in form.items() if isinstance(v, str)}
        else:
            data = await read_capped(request)
            if data is None:
                return None, None, None, too_big
            fields = dict(request.query_params)
        if not data:
            return None, None, None, err(400, "empty_audio", "The audio was empty.")
        if len(data) > MAX_UPLOAD_BYTES:
            return None, None, None, too_big
        secs = await off_loop(audio_seconds, data)
        if secs is None:
            return None, None, None, err(415, "unsupported_audio",
                                         "Could not read that audio. Send WAV, MP3, M4A, AAC, OGG, WebM or FLAC.")
        limit = DEMO_MAX_AUDIO_SECONDS if rec.is_demo else MAX_AUDIO_SECONDS
        if secs > limit:
            return None, None, None, err(413, "audio_too_long",
                                         f"Audio must be {int(limit)} seconds or shorter.")
        return data, secs, fields, None

    def record(bg: BackgroundTasks, rec: KeyRecord, endpoint: str, model: str, t0: float, status: int,
               sent_s: float = 0.0, returned_s: float = 0.0, chars: int = 0):
        """One usage row per request that reached a model, with what it counts (billable_seconds)."""
        seconds = billable_seconds(endpoint, status, sent_s, returned_s)
        rec.used_audio_seconds += seconds      # keep the cached quota honest
        bg.add_task(store.record, Usage(rec.key_id, rec.user_id, endpoint, model,
                                        round(seconds, 3), chars, status,
                                        int((now() - t0) * 1000)))

    def upstream_failed():
        return err(502, "upstream_error",
                   "The model service did not answer. Try again in a moment.")

    def time_left(rec: KeyRecord, t0: float) -> float:
        # The caller's budget runs from the request's arrival: reading, probing and checking the
        # upload come out of it, so the website's routes still hear from the gateway before they quit.
        return upstream_budget(rec) - (now() - t0)

    async def call_upstream(call, *args, expect: str = "json", silence_is_422: bool = False):
        """One call to a model service, with every way it can fail mapped to the API's envelope.

        -> (result, 200, None) or (None, status, error response). The result is the reply's JSON
        object, or for expect="audio" the reply itself. A network error, an answer that is not
        what was expected, or any other status is 502; running out of time is 504
        (UpstreamTimeout). silence_is_422: this service answers 422 only when it heard nothing
        (namu-interpret and namu-agent; namu-transcribe also uses 422 for its own failures).
        """
        try:
            reply = await off_loop(call, *args)
        except TimeoutError:
            return None, 504, err(504, "upstream_timeout", "The model took too long to answer. "
                                  "Try again: the first request after a quiet spell wakes it.")
        except Exception as e:
            print(f"upstream call failed: {type(e).__name__} [{request_id.get()}]", flush=True)
            return None, 502, upstream_failed()
        if reply.status == 422 and silence_is_422:
            return None, 422, err(422, "nothing_heard", "No speech was heard in the audio.")
        if reply.status != 200:
            print(f"upstream answered {reply.status} [{request_id.get()}]", flush=True)
            return None, 502, upstream_failed()
        if expect == "audio":
            if reply.content_type.startswith("audio"):
                return reply, 200, None
            return None, 502, upstream_failed()
        try:
            out = reply.json()
        except ValueError:
            out = None
        if not isinstance(out, dict):
            return None, 502, upstream_failed()
        return out, 200, None

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
        rec, e = await identify(request)
        if e:
            return e
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
        out, status, e = await call_upstream(upstream.transcribe, data, language, time_left(rec, t0))
        record(bg, rec, "transcribe", "tatsuniya", t0, status, sent_s=secs)
        if e:
            return e
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
            body = None
        # A list, a string, or a text or voice that is not a string would fail further down as a 500.
        if not isinstance(body, dict) or not all(isinstance(body.get(k) or "", str) for k in ("text", "voice", "format")):
            return err(400, "invalid_json", 'Send JSON: {"text": "...", "voice": "nadia"}.')
        fmt = body.get("format") or "wav"
        if fmt not in SPEECH_FORMATS and fmt != "json":
            return err(400, "invalid_request", "'format' must be wav, mp3, opus or json.")
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
        reply, status, e = await call_upstream(upstream.speak, text, v["language"], v["upstream"],
                                               time_left(rec, t0), expect="audio")
        if e:
            record(bg, rec, "speech", "tafiya", t0, status, chars=len(text))
            return e
        try:
            secs = wav_seconds(reply.content)
        except Exception:
            secs = 0.0
        audio = reply.content
        if fmt in ENCODE_ARGS:
            audio = await off_loop(encode, reply.content, fmt)
            if not audio:                      # a request that fails counts nothing, whatever failed
                record(bg, rec, "speech", "tafiya", t0, 500, chars=len(text))
                return err(500, "encode_failed", f"The speech could not be encoded as {fmt}. Try format wav.")
        record(bg, rec, "speech", "tafiya", t0, 200, returned_s=secs, chars=len(text))
        if fmt == "json":
            return {"model": "tafiya", "voice": voice, "audio_seconds": round(secs, 2),
                    "audio": base64.b64encode(reply.content).decode(), "sample_rate": 24000}
        return Response(audio, media_type=SPEECH_FORMATS[fmt],
                        headers={"X-Audio-Seconds": f"{secs:.2f}"})

    @web.post("/v1/translate")
    async def translate(request: Request, bg: BackgroundTasks):
        t0 = now()
        rec, e = await authorize(request, "translate")
        if e:
            return e
        if request.headers.get("content-type", "").startswith("application/json"):
            return await translate_text(request, bg, rec, t0)
        data, secs, fields, e = await read_audio(request, rec)
        if e:
            return e
        target = fields.get("target", "fr")
        source = fields.get("source") or ("ha" if target == "fr" else "fr")
        if {source, target} != {"ha", "fr"}:
            return err(400, "unsupported_pair", "Kora translates between Hausa and French.")
        out, status, e = await call_upstream(upstream.translate, data, source, target,
                                             time_left(rec, t0), silence_is_422=True)
        record(bg, rec, "translate", "kora", t0, status, sent_s=secs)
        if e:
            return e
        res = {"model": "kora", "source": source, "target": target,
               "source_text": out.get("source_text", ""), "text": out.get("target_text", ""),
               "audio_seconds": round(secs, 2)}
        if str(fields.get("include_audio", "")).lower() in ("1", "true", "yes"):
            # Text only where speech is withdrawn (French), whatever the model service sent.
            res["audio"] = out.get("audio") if target in SPOKEN_TARGETS else None
        return res

    async def translate_text(request: Request, bg: BackgroundTasks, rec: KeyRecord, t0: float):
        """/v1/translate with JSON { text, source, target }: text in, text out (and, with include_audio, the
        translation spoken in the target language's first voice). Counted by characters; no audio was sent."""
        try:
            body = await request.json()
        except Exception:
            body = None
        if not isinstance(body, dict) or not all(isinstance(body.get(k) or "", str) for k in ("text", "source", "target")):
            return err(400, "invalid_json", 'Send JSON: {"text": "...", "source": "fr", "target": "ha"}.')
        text = (body.get("text") or "").strip()
        if not text:
            return err(400, "missing_text", "'text' is required.")
        cap = DEMO_MAX_TEXT_CHARS if rec.is_demo else MAX_TEXT_CHARS
        if len(text) > cap:
            return err(413, "text_too_long", f"'text' must be {cap} characters or fewer.")
        target = body.get("target") or "fr"
        source = body.get("source") or ("ha" if target == "fr" else "fr")
        if {source, target} != {"ha", "fr"}:
            return err(400, "unsupported_pair", "Kora translates between Hausa and French.")
        out, status, e = await call_upstream(upstream.translate_text, text, source, target, time_left(rec, t0))
        said_s = len(text) / TEXT_CHARS_PER_SECOND
        if e:
            record(bg, rec, "translate", "kora", t0, status, chars=len(text))
            return e
        res = {"model": "kora", "source": source, "target": target, "source_text": text,
               "text": out.get("text", ""), "characters": len(text)}
        spoken_s = 0.0
        spoken = str(body.get("include_audio", request.query_params.get("include_audio", ""))).lower() in ("1", "true", "yes")
        if spoken:
            # Text only where speech is withdrawn (French), as for audio in.
            res["audio"] = None
        if spoken and res["text"] and target in SPOKEN_TARGETS:
            voice = next(v for v in VOICES.values() if v["language"] == target)
            reply, _, e = await call_upstream(upstream.speak, res["text"], target, voice["upstream"],
                                              time_left(rec, t0), expect="audio")
            if reply is not None:
                res["audio"] = base64.b64encode(reply.content).decode()
                try:
                    spoken_s = wav_seconds(reply.content)
                except Exception:
                    spoken_s = 0.0
        # the row says "translate"; what it counts is billable_seconds("translate_text", ...)
        seconds = billable_seconds("translate_text", 200, said_s, spoken_s)
        record(bg, rec, "translate", "kora", t0, 200, sent_s=seconds, chars=len(text))
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
            return err(400, "unknown_persona", f"Unknown persona. Try one of: {', '.join(PERSONAS)}.")
        # Stateless: the reply is to this turn's audio alone, and no conversation is kept. A session_id is still
        # accepted and echoed back, so existing clients keep working; it is never sent on or stored.
        client_sid = (fields.get("session_id") or "")[:100] or None
        out, status, e = await call_upstream(upstream.converse, data, persona,
                                             time_left(rec, t0), silence_is_422=True)
        if e:
            record(bg, rec, "converse", "air", t0, status, sent_s=secs)
            return e
        try:
            out_secs = wav_seconds(base64.b64decode(out.get("audio") or ""))
        except Exception:
            out_secs = 0.0
        record(bg, rec, "converse", "air", t0, 200, sent_s=secs, returned_s=out_secs)
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
        # are retired well before that happens. A request holds a connection only for a
        # key lookup or a usage write, a few milliseconds, so 8 serve MAX_INPUTS requests
        # (and four containers open at most 32 on Neon's pooled endpoint).
        self.pool = ConnectionPool(url, min_size=1, max_size=8, open=True, max_idle=120,
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
    """The four model services, called with Modal proxy-auth headers.

    A Modal web call that runs past 150 s is answered with a 303 to the same URL plus a result
    parameter, which blocks until the work is done. Each call follows those 303s, within its time
    budget, so a long translation is a result and not a failure. Redirects are followed only to
    the same origin (scheme, host and port): the proxy token must never leave Modal, nor travel
    unencrypted.
    """

    MAX_HOPS = 20                              # Modal's own limit for a chain of result redirects

    def __init__(self, urls: dict, proxy_key: str | None, proxy_secret: str | None, transport=None,
                 clock=time.monotonic):
        import httpx

        h = {}
        if proxy_key and proxy_secret:
            h = {"Modal-Key": proxy_key, "Modal-Secret": proxy_secret}
        self.urls, self.clock = urls, clock
        # One connection per request in flight at most, and MAX_INPUTS requests per container.
        self.http = httpx.Client(headers=h, transport=transport, follow_redirects=False,
                                 limits=httpx.Limits(max_connections=MAX_INPUTS))

    def _post(self, url: str, timeout: float, **kw) -> UpstreamReply:
        deadline = self.clock() + timeout
        r = self._send("POST", url, deadline, **kw)
        for _ in range(self.MAX_HOPS):
            nxt = r.url.join(r.headers["location"]) if r.status_code == 303 and "location" in r.headers else None
            if nxt is None or (nxt.scheme, nxt.host, nxt.port) != (r.url.scheme, r.url.host, r.url.port):
                break
            r = self._send("GET", nxt, deadline)
        return UpstreamReply(r.status_code, r.content, r.headers.get("content-type", ""))

    def _send(self, method: str, url, deadline: float, **kw):
        """One request within what is left of the budget. A failed connection is retried once:
        nothing reached the model, so it cannot run twice. Out of time -> UpstreamTimeout."""
        import httpx

        for attempt in (1, 2):
            left = deadline - self.clock()
            if left <= 0:
                raise UpstreamTimeout("no time left")
            try:
                return self.http.request(method, url, timeout=httpx.Timeout(
                    left, connect=min(left, CONNECT_TIMEOUT_S)), **kw)
            except (httpx.ConnectError, httpx.ConnectTimeout):
                if attempt == 2:
                    raise
                # Jitter, so containers that lost their connections together do not all come back at once.
                time.sleep(random.uniform(0.2, 1.0))
            except httpx.TimeoutException as e:
                raise UpstreamTimeout(type(e).__name__) from e

    def transcribe(self, data: bytes, language: str, timeout: float) -> UpstreamReply:
        return self._post(
            f"{self.urls['transcribe']}/v1/transcribe", timeout, params={"language": language},
            content=data, headers={"Content-Type": "application/octet-stream"})

    def speak(self, text: str, language: str, voice: str, timeout: float) -> UpstreamReply:
        return self._post(
            f"{self.urls['voice']}/v1/speak", timeout,
            json={"text": text, "language": language, "voice": voice})

    def translate(self, data: bytes, source: str, target: str, timeout: float) -> UpstreamReply:
        return self._post(
            f"{self.urls['interpret']}/v1/speech", timeout, params={"source": source, "target": target},
            content=data, headers={"Content-Type": "application/octet-stream"})

    def translate_text(self, text: str, source: str, target: str, timeout: float) -> UpstreamReply:
        return self._post(
            f"{self.urls['interpret']}/v1/translate", timeout,
            json={"text": text, "source": source, "target": target})

    def converse(self, data: bytes, persona: str, timeout: float) -> UpstreamReply:
        # No session id goes to the agent: converse is one turn, and nothing names a conversation to keep.
        return self._post(
            f"{self.urls['agent']}/v1/speech", timeout, params={"persona": persona}, content=data,
            headers={"Content-Type": "application/octet-stream"})


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


class MemoryLimiter:
    """Fixed-window counters in this process: the limiter of the AWS gateway.

    Each task counts on its own, so with N tasks a caller can reach at most N times a limit (the load
    balancer spreads a caller's requests across tasks, so in practice it is far less). Abuse control,
    like DictLimiter; the monthly allowance is metered in Postgres, not here.
    """

    MAX_BUCKETS = 100_000                      # bounds memory under a flood of distinct callers

    def __init__(self, clock=time.time):
        import threading

        self.clock, self.lock, self.counts = clock, threading.Lock(), {}

    def hit(self, bucket: str, limit: int, window_s: int) -> tuple[bool, int]:
        t = int(self.clock())
        win = t // window_s
        with self.lock:
            if len(self.counts) >= self.MAX_BUCKETS:   # keep only windows that are still open
                self.counts = {k: n for k, n in self.counts.items() if k[2] == t // k[1]}
            k = (bucket, window_s, win)
            n = self.counts[k] = self.counts.get(k, 0) + 1
        if n > limit:
            return False, (win + 1) * window_s - t
        return True, 0


if modal is not None:
    image = (
        modal.Image.debian_slim(python_version="3.11")
        # ffprobe: audio length before any GPU work; ffmpeg: /v1/speech in MP3 or Ogg Opus. ffprobe parses
        # untrusted uploads, so
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
        min_containers=1,                      # the front door should never cold-start
        max_containers=4,
        timeout=900,
        scaledown_window=600,
    )
    @modal.concurrent(max_inputs=MAX_INPUTS)
    @modal.asgi_app()
    def api():
        store = PostgresStore(os.environ["GATEWAY_DATABASE_URL"])
        upstream = ModalUpstream(UPSTREAM, os.environ.get("MODAL_PROXY_KEY"),
                                 os.environ.get("MODAL_PROXY_SECRET"))
        limiter = DictLimiter(modal.Dict.from_name("namu-gateway-ratelimit", create_if_missing=True))
        return create_app(store, upstream, limiter, os.environ["NAMU_KEY_PEPPER"])
