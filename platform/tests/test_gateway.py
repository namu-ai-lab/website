"""Security and contract tests for namu-gateway, with no Modal, Supabase or GPU.

    python3 -m pytest platform/tests -q     (pip install -r platform/requirements-dev.txt first)

Each rule the gateway claims (keys, revocation, beta approval, scopes, quota,
rate limits, demo limits, input caps, session isolation, metering without
content) is checked here against fakes, so a regression shows up locally
before it reaches the deployed API.
"""

import base64
import io
import shutil
import subprocess
import sys
import wave
from dataclasses import replace
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "modal"))
import namu_gateway as gw  # noqa: E402

PEPPER = "test-pepper"
GOOD = "namu_sk_" + "A" * 43
DEMO = "namu_sk_" + "D" * 43
SERVICE = "namu_sk_" + "S" * 43


def wav(seconds: float = 1.0, rate: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b"\x00\x00" * int(seconds * rate))
    return buf.getvalue()


BASE = gw.KeyRecord(key_id="k1", user_id="u1", scopes=list(gw.SCOPES), revoked=False,
                    is_demo=False, rate_limit_per_min=60, beta_status="approved",
                    monthly_audio_seconds=1800, used_audio_seconds=0)


class FakeStore:
    def __init__(self):
        self.keys = {gw.hash_key(GOOD, PEPPER): replace(BASE),
                     gw.hash_key(DEMO, PEPPER): replace(BASE, key_id="kd", is_demo=True),
                     gw.hash_key(SERVICE, PEPPER): replace(BASE, key_id="ks", user_id="namu-website", is_service=True)}
        self.accounts = {"dev-1": ("approved", 1800, 0), "paused-1": ("denied", 1800, 0), "full-1": ("approved", 1800, 1800)}
        self.usage: list[gw.Usage] = []
        self.lookups = 0
        self.down = False

    def lookup(self, h):
        self.lookups += 1
        if self.down:
            raise ConnectionError("supabase unreachable")
        r = self.keys.get(h)
        return replace(r) if r else None

    def account(self, user_id):
        return self.accounts.get(user_id)

    def record(self, u):
        self.usage.append(u)


class FakeUpstream:
    def __init__(self):
        self.calls = []
        self.fail = False

    def _ok(self, payload):
        return gw.UpstreamReply(200, __import__("json").dumps(payload).encode())

    def transcribe(self, data, language):
        self.calls.append(("transcribe", language))
        if self.fail:
            return gw.UpstreamReply(500, b"boom")
        return self._ok({"text": "sannu da zuwa"})

    def speak(self, text, language, voice):
        self.calls.append(("speak", language, voice))
        return gw.UpstreamReply(200, wav(2.0, 24000), "audio/wav")

    def translate(self, data, source, target):
        self.calls.append(("translate", source, target))
        return self._ok({"source_text": "sannu", "target_text": "bonjour", "audio": "QUJD"})

    def converse(self, data, persona, session_id):
        self.calls.append(("converse", persona, session_id))
        return self._ok({"question": "wane sunana?", "reply": "Sunanka Musa.",
                         "audio": base64.b64encode(wav(1.5, 24000)).decode()})


class FakeLimiter:
    def __init__(self):
        self.counts = {}

    def hit(self, bucket, limit, window_s):
        self.counts[bucket] = self.counts.get(bucket, 0) + 1
        return (self.counts[bucket] <= limit, window_s)


class Clock:
    def __init__(self):
        self.t = 1_000_000.0

    def __call__(self):
        return self.t


@pytest.fixture
def env():
    store, up, lim, clock = FakeStore(), FakeUpstream(), FakeLimiter(), Clock()
    app = gw.create_app(store, up, lim, PEPPER, audio_seconds=lambda b: gw.wav_seconds(b), now=clock)
    return TestClient(app), store, up, lim, clock


def auth(key=GOOD):
    return {"Authorization": f"Bearer {key}"}


def post_audio(client, path, key=GOOD, seconds=1.0, **fields):
    return client.post(path, headers=auth(key),
                       files={"file": ("a.wav", wav(seconds), "audio/wav")}, data=fields)


# ---------------------------------------------------------------- authentication
def test_missing_key_is_401(env):
    c, *_ = env
    r = c.post("/v1/transcribe", files={"file": ("a.wav", wav(), "audio/wav")})
    assert r.status_code == 401 and r.json()["error"]["type"] == "missing_api_key"


def test_malformed_key_is_401_without_store_lookup(env):
    c, store, *_ = env
    r = post_audio(c, "/v1/transcribe", key="sk-not-ours")
    assert r.status_code == 401 and r.json()["error"]["type"] == "invalid_api_key"
    assert store.lookups == 0


def test_unknown_key_is_401(env):
    c, *_ = env
    r = post_audio(c, "/v1/transcribe", key="namu_sk_" + "Z" * 43)
    assert r.status_code == 401 and r.json()["error"]["type"] == "invalid_api_key"


def test_revoked_key_is_401(env):
    c, store, *_ = env
    store.keys[gw.hash_key(GOOD, PEPPER)].revoked = True
    r = post_audio(c, "/v1/transcribe")
    assert r.status_code == 401 and r.json()["error"]["type"] == "key_revoked"


def test_revocation_applies_within_cache_ttl(env):
    c, store, up, lim, clock = env
    assert post_audio(c, "/v1/transcribe").status_code == 200
    store.keys[gw.hash_key(GOOD, PEPPER)].revoked = True
    clock.t += gw.KEY_CACHE_TTL + 1
    assert post_audio(c, "/v1/transcribe").status_code == 401


def test_paused_account_is_403(env):
    c, store, *_ = env
    store.keys[gw.hash_key(GOOD, PEPPER)].beta_status = "denied"
    r = post_audio(c, "/v1/transcribe")
    assert r.status_code == 403 and r.json()["error"]["type"] == "account_paused"


def test_missing_scope_is_403(env):
    c, store, *_ = env
    store.keys[gw.hash_key(GOOD, PEPPER)].scopes = ["speech"]
    r = post_audio(c, "/v1/transcribe")
    assert r.status_code == 403 and r.json()["error"]["type"] == "insufficient_scope"


def test_store_outage_is_503_not_500(env):
    c, store, *_ = env
    store.down = True
    r = post_audio(c, "/v1/transcribe")
    assert r.status_code == 503 and r.json()["error"]["type"] == "auth_unavailable"


def test_key_hash_matches_website_vector():
    # The same vector is asserted on the Node side (src/lib/keys.ts).
    # Computed independently with Node's crypto.createHmac; the two must agree
    # or every key the website issues would be rejected here.
    assert gw.hash_key("namu_sk_test", "pepper") == (
        "80ceafbaa25f6536d8fea1300f7f497ad6a2a6ac66b4f9f31302bcc376275bdc"
    )


# ---------------------------------------------------------------- quota and limits
def test_quota_exceeded_is_429(env):
    c, store, *_ = env
    store.keys[gw.hash_key(GOOD, PEPPER)].used_audio_seconds = 1800
    r = post_audio(c, "/v1/transcribe")
    assert r.status_code == 429 and r.json()["error"]["type"] == "quota_exceeded"


def test_rate_limit_is_429_with_retry_after(env):
    c, store, *_ = env
    store.keys[gw.hash_key(GOOD, PEPPER)].rate_limit_per_min = 2
    assert post_audio(c, "/v1/transcribe").status_code == 200
    assert post_audio(c, "/v1/transcribe").status_code == 200
    r = post_audio(c, "/v1/transcribe")
    assert r.status_code == 429 and r.json()["error"]["type"] == "rate_limited"
    assert "retry-after" in r.headers


def test_audio_too_long_rejected_before_gpu(env):
    c, store, up, *_ = env
    r = post_audio(c, "/v1/transcribe", seconds=gw.MAX_AUDIO_SECONDS + 1)
    assert r.status_code == 413 and r.json()["error"]["type"] == "audio_too_long"
    assert up.calls == []


def test_demo_key_has_short_audio_cap(env):
    c, store, up, *_ = env
    r = post_audio(c, "/v1/transcribe", key=DEMO, seconds=gw.DEMO_MAX_AUDIO_SECONDS + 1)
    assert r.status_code == 413 and up.calls == []


def test_demo_key_is_limited_per_visitor_ip(env):
    c, *_ = env
    h = {**auth(DEMO), "X-Namu-Client-IP": "203.0.113.7"}
    for _ in range(gw.DEMO_IP_PER_HOUR):
        assert c.post("/v1/transcribe", headers=h,
                      files={"file": ("a.wav", wav(), "audio/wav")}).status_code == 200
    r = c.post("/v1/transcribe", headers=h, files={"file": ("a.wav", wav(), "audio/wav")})
    assert r.status_code == 429
    # another visitor is unaffected
    h2 = {**auth(DEMO), "X-Namu-Client-IP": "198.51.100.9"}
    assert c.post("/v1/transcribe", headers=h2,
                  files={"file": ("a.wav", wav(), "audio/wav")}).status_code == 200


def test_ip_header_ignored_for_normal_keys(env):
    c, store, up, lim, _ = env
    post_audio(c, "/v1/transcribe")
    assert not any(b.startswith("demo-ip:") for b in lim.counts)


# ---------------------------------------------------------------- endpoints
def test_transcribe_ok_and_metered_without_content(env):
    c, store, *_ = env
    r = post_audio(c, "/v1/transcribe", seconds=2.0)
    assert r.status_code == 200
    body = r.json()
    assert body == {"model": "tatsuniya", "text": "sannu da zuwa", "language": "ha",
                    "audio_seconds": 2.0}
    u = store.usage[-1]
    assert (u.endpoint, u.model, u.status) == ("transcribe", "tatsuniya", 200)
    assert u.audio_seconds == 2.0
    # usage rows carry numbers only: no field holds the transcript
    assert "sannu" not in repr(u)


def test_transcribe_rejects_other_languages(env):
    c, *_ = env
    r = post_audio(c, "/v1/transcribe", language="fr")
    assert r.status_code == 400


def test_upstream_failure_is_502_and_recorded(env):
    c, store, up, *_ = env
    up.fail = True
    r = post_audio(c, "/v1/transcribe")
    assert r.status_code == 502 and r.json()["error"]["type"] == "upstream_error"
    assert store.usage[-1].status == 502
    assert "boom" not in r.text            # internal errors are not leaked


def test_speech_returns_wav_and_counts_characters(env):
    c, store, up, *_ = env
    r = c.post("/v1/speech", headers=auth(), json={"text": "Sannu da zuwa.", "voice": "warm"})
    assert r.status_code == 200 and r.headers["content-type"] == "audio/wav"
    assert up.calls[-1] == ("speak", "ha", "nadia")          # warm is an alias of nadia
    assert store.usage[-1].characters == len("Sannu da zuwa.")
    assert store.usage[-1].audio_seconds == 2.0


def test_speech_validation(env):
    c, *_ = env
    assert c.post("/v1/speech", headers=auth(), json={"text": ""}).status_code == 400
    assert c.post("/v1/speech", headers=auth(), json={"text": "x", "voice": "nobody"}).status_code == 400
    r = c.post("/v1/speech", headers=auth(), json={"text": "x" * (gw.MAX_TEXT_CHARS + 1)})
    assert r.status_code == 413


def test_translate_pair_and_optional_audio(env):
    c, *_ = env
    r = post_audio(c, "/v1/translate", target="fr")
    assert r.status_code == 200 and r.json()["text"] == "bonjour" and "audio" not in r.json()
    r = post_audio(c, "/v1/translate", target="fr", include_audio="true")
    assert r.json()["audio"] == "QUJD"
    assert post_audio(c, "/v1/translate", target="en").status_code == 400


def test_converse_sessions_are_namespaced_per_account(env):
    c, store, up, *_ = env
    r = post_audio(c, "/v1/converse", session_id="call-1", persona="salim")
    assert r.status_code == 200
    assert up.calls[-1] == ("converse", "salim", "u1:call-1")     # never the bare id
    assert r.json()["session_id"] == "call-1"                      # caller sees their own id
    assert store.usage[-1].audio_seconds == pytest.approx(2.5)     # 1.0 in + 1.5 out


def test_converse_without_session_is_stateless(env):
    c, store, up, *_ = env
    post_audio(c, "/v1/converse")
    assert up.calls[-1][2] is None


def test_public_catalogue_needs_no_key(env):
    c, *_ = env
    assert c.get("/v1/models").status_code == 200
    assert {v["id"] for v in c.get("/v1/voices").json()["data"]} >= {"nadia", "salim", "warm"}


# ---------------------------------------------------------------- the website's service key (console Playground)
def as_account(acct):
    return {**auth(SERVICE), "X-Namu-Account": acct}


def test_service_key_needs_an_account(env):
    c, *_ = env
    r = c.post("/v1/speech", headers=auth(SERVICE), json={"text": "Sannu", "voice": "nadia"})
    assert r.status_code == 403 and r.json()["error"]["type"] == "account_required"


def test_service_key_refuses_unknown_account(env):
    c, *_ = env
    r = c.post("/v1/speech", headers=as_account("nobody"), json={"text": "Sannu", "voice": "nadia"})
    assert r.status_code == 403 and r.json()["error"]["type"] == "unknown_account"


def test_service_key_runs_as_the_account(env):
    c, store, *_ = env
    r = c.post("/v1/speech", headers=as_account("dev-1"), json={"text": "Sannu", "voice": "nadia"})
    assert r.status_code == 200
    u = store.usage[-1]
    assert u.user_id == "dev-1" and u.key_id == "ks"           # metered to the developer, labelled as the Playground


def test_service_key_respects_a_paused_account(env):
    c, *_ = env
    r = c.post("/v1/speech", headers=as_account("paused-1"), json={"text": "Sannu", "voice": "nadia"})
    assert r.status_code == 403 and r.json()["error"]["type"] == "account_paused"


def test_service_key_respects_the_account_allowance(env):
    c, *_ = env
    r = c.post("/v1/transcribe", headers=as_account("full-1"), files={"file": ("a.wav", wav(), "audio/wav")})
    assert r.status_code == 429 and r.json()["error"]["type"] == "quota_exceeded"


def test_service_key_rate_limit_is_per_account(env):
    c, _, _, lim, _ = env
    for _ in range(gw.SERVICE_PER_MIN):
        assert c.post("/v1/speech", headers=as_account("dev-1"), json={"text": "Sannu", "voice": "nadia"}).status_code == 200
    r = c.post("/v1/speech", headers=as_account("dev-1"), json={"text": "Sannu", "voice": "nadia"})
    assert r.status_code == 429 and r.json()["error"]["type"] == "rate_limited"
    assert "acct:dev-1" in lim.counts and not any(b.startswith("key:ks") for b in lim.counts)


def test_ordinary_keys_ignore_the_account_header(env):
    c, store, *_ = env
    r = c.post("/v1/speech", headers={**auth(), "X-Namu-Account": "dev-1"}, json={"text": "Sannu", "voice": "nadia"})
    assert r.status_code == 200 and store.usage[-1].user_id == "u1"


def test_service_key_usage_is_per_account(env):
    c, *_ = env
    assert c.get("/v1/usage", headers=auth(SERVICE)).json()["error"]["type"] == "account_required"
    r = c.get("/v1/usage", headers=as_account("full-1")).json()
    assert r == {"month_audio_seconds_used": 1800.0, "month_audio_seconds_limit": 1800.0}


# ---------------------------------------------------------------- what ffprobe may parse
HLS = b"#EXTM3U\n#EXT-X-TARGETDURATION:1\n#EXTINF:1,\nhttp://127.0.0.1:9/x.ts\n#EXT-X-ENDLIST\n"
CONCAT = b"ffconcat version 1.0\nfile '/etc/passwd'\n"
TEXT = b"hello, this is not audio"


@pytest.mark.parametrize("head, demuxer", [
    (b"RIFF\x24\x08\x00\x00WAVEfmt ", "wav"),
    (b"ID3\x04\x00\x00\x00\x00\x00\x23TSS", "mp3"),
    (b"\xff\xfb\x90\x64" + b"\x00" * 8, "mp3"),             # an MP3 frame with no ID3 tag
    (b"\xff\xf1\x50\x40\x21\x3f\xfc\xde", "aac"),            # ADTS AAC
    (b"OggS\x00\x02" + b"\x00" * 6, "ogg"),
    (b"\x1a\x45\xdf\xa3\x9f\x42\x86\x81", "matroska"),       # WebM
    (b"\x00\x00\x00\x1cftypM4A ", "mov"),
    (b"\x00\x00\x00\x18ftyp3gp4", "mov"),
    (b"fLaC\x00\x00\x00\x22", "flac"),
])
def test_allowed_containers_get_one_named_demuxer(head, demuxer):
    assert gw.sniff_audio(head) == demuxer


@pytest.mark.parametrize("data", [HLS, CONCAT, TEXT, b"", b"\x00" * 64])
def test_other_input_never_reaches_ffprobe(data, monkeypatch):
    def no_ffprobe(*a, **k):
        raise AssertionError("ffprobe must not run on this input")
    monkeypatch.setattr(gw.subprocess, "run", no_ffprobe)
    assert gw.sniff_audio(data) is None
    assert gw.probe_seconds(data) is None


def test_ffprobe_is_pinned_to_the_file_and_the_demuxer(monkeypatch):
    seen = {}

    def fake_run(args, **kwargs):
        seen["args"] = args
        return type("Done", (), {"stdout": "1.5\n"})()
    monkeypatch.setattr(gw.subprocess, "run", fake_run)
    assert gw.probe_seconds(b"OggS" + b"\x00" * 60) == 1.5
    args = seen["args"]
    assert args[args.index("-protocol_whitelist") + 1] == "file"
    assert args[args.index("-f") + 1] == "ogg"
    assert args[-1].startswith("file:")



@pytest.mark.parametrize("declared", ["-5000.0", "0.000000", "nan", "inf", "N/A", ""])
def test_a_declared_length_that_is_not_positive_and_finite_is_refused(declared, monkeypatch):
    # the length is the file's own claim: a forged negative one would credit the account
    monkeypatch.setattr(gw.subprocess, "run", lambda *a, **k: type("Done", (), {"stdout": declared + "\n"})())
    assert gw.probe_seconds(b"\x1a\x45\xdf\xa3" + b"\x00" * 60) is None


def test_an_empty_wav_is_refused():
    assert gw.probe_seconds(wav(0.0)) is None


def test_gateway_refuses_a_playlist_before_any_gpu():
    store, up = FakeStore(), FakeUpstream()
    c = TestClient(gw.create_app(store, up, FakeLimiter(), PEPPER, now=Clock()))     # the real probe_seconds
    r = c.post("/v1/transcribe", headers=auth(), files={"file": ("a.m3u8", HLS, "audio/mpegurl")})
    assert r.status_code == 415 and r.json()["error"]["type"] == "unsupported_audio"
    assert up.calls == [] and store.usage == []


FFMPEG = shutil.which("ffmpeg") and shutil.which("ffprobe")


@pytest.mark.skipif(not FFMPEG, reason="needs ffmpeg and ffprobe on PATH")
@pytest.mark.parametrize("name, codec", [
    ("float.wav", ["-c:a", "pcm_f32le"]),      # not 16-bit PCM, so Python's wave module passes it to ffprobe
    ("a.mp3", ["-c:a", "libmp3lame"]),
    ("a.m4a", ["-c:a", "aac"]),
    ("a.aac", ["-c:a", "aac", "-f", "adts"]),
    ("a.ogg", ["-c:a", "libopus"]),
    ("a.webm", ["-c:a", "libopus"]),
    ("a.flac", ["-c:a", "flac"]),
])
def test_real_files_of_each_allowed_format_are_measured(name, codec, tmp_path):
    out = tmp_path / name
    made = subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
                           *codec, str(out)], capture_output=True)
    if made.returncode != 0:
        pytest.skip(f"this ffmpeg cannot encode {name}")
    assert gw.probe_seconds(out.read_bytes()) == pytest.approx(1.0, abs=0.1)
