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

import httpx
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
        self.budgets = []
        self.fail = False

    def _ok(self, payload):
        return gw.UpstreamReply(200, __import__("json").dumps(payload).encode())

    def transcribe(self, data, language, timeout):
        self.calls.append(("transcribe", language))
        self.budgets.append(timeout)
        if self.fail:
            return gw.UpstreamReply(500, b"boom")
        return self._ok({"text": "sannu da zuwa"})

    def speak(self, text, language, voice, timeout):
        self.calls.append(("speak", language, voice))
        self.budgets.append(timeout)
        return gw.UpstreamReply(200, wav(2.0, 24000), "audio/wav")

    def translate(self, data, source, target, timeout):
        self.calls.append(("translate", source, target))
        self.budgets.append(timeout)
        return self._ok({"source_text": "sannu", "target_text": "bonjour", "audio": "QUJD"})

    def translate_text(self, text, source, target, timeout):
        self.calls.append(("translate_text", source, target))
        self.budgets.append(timeout)
        return self._ok({"text": "Sannu da zuwa", "source": source, "target": target})

    def converse(self, data, persona, session_id, timeout):
        self.calls.append(("converse", persona, session_id))
        self.budgets.append(timeout)
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
    # src/lib/keys.test.ts asserts the same vector against the website's hashKey
    # (Node's crypto.createHmac). The two must agree, or every key the website
    # issues would be rejected here. The pepper is 32 characters, the shortest
    # hashKey accepts.
    assert gw.hash_key("namu_sk_" + "A" * 43, "0123456789abcdef0123456789abcdef") == (
        "9c07945d58ba81849eb9033b10c0b75f7b82d676e715d4763e5089231ff94e5d"
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



def test_a_declared_oversize_upload_is_refused_before_it_is_read(env):
    c, store, up, *_ = env
    r = c.post("/v1/transcribe", headers={**auth(), "Content-Length": str(10**9)}, content=wav())
    assert r.status_code == 413 and r.json()["error"]["type"] == "payload_too_large"
    assert up.calls == []


def test_a_raw_body_is_cut_off_at_the_cap(env, monkeypatch):
    c, store, up, *_ = env
    monkeypatch.setattr(gw, "MAX_UPLOAD_BYTES", 1000)
    monkeypatch.setattr(gw, "MULTIPART_SLACK_BYTES", 0)
    body = (b"\x00" * 500 for _ in range(10))            # chunked: no Content-Length to go by
    r = c.post("/v1/transcribe", headers=auth(), content=body)
    assert r.status_code == 413 and up.calls == []


def test_a_multipart_file_over_the_cap_is_refused(env, monkeypatch):
    c, store, up, *_ = env
    monkeypatch.setattr(gw, "MAX_UPLOAD_BYTES", 1000)       # the 1 MB slack still lets the request in
    r = post_audio(c, "/v1/transcribe")                     # one second of WAV: 32 KB
    assert r.status_code == 413 and up.calls == []


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




# ---------------------------------------------------------------- when a model service fails
AUDIO_CALLS = [("/v1/transcribe", "transcribe"), ("/v1/translate", "translate"), ("/v1/converse", "converse")]


def call_audio_endpoint(c, path):
    return post_audio(c, path, seconds=10.0)


def call_speech(c):
    return c.post("/v1/speech", headers=auth(), json={"text": "Sannu", "voice": "nadia"})


def raising(exc):
    def call(*a, **k):
        raise exc
    return call


@pytest.mark.parametrize("path, call", AUDIO_CALLS)
def test_a_network_error_is_a_502_envelope_counted_at_zero(env, path, call):
    c, store, up, *_ = env
    setattr(up, call, raising(httpx.ConnectError("connection refused")))
    r = call_audio_endpoint(c, path)
    assert r.status_code == 502 and r.json()["error"]["type"] == "upstream_error"
    u = store.usage[-1]
    assert (u.endpoint, u.status, u.audio_seconds) == (call, 502, 0.0)


def test_speech_network_error_is_a_502_envelope(env):
    c, store, up, *_ = env
    up.speak = raising(httpx.ConnectError("connection refused"))
    r = call_speech(c)
    assert r.status_code == 502 and r.json()["error"]["type"] == "upstream_error"
    assert (store.usage[-1].status, store.usage[-1].audio_seconds) == (502, 0.0)


@pytest.mark.parametrize("path, call", AUDIO_CALLS)
def test_running_out_of_time_is_a_504_envelope_counted_at_zero(env, path, call):
    c, store, up, *_ = env
    setattr(up, call, raising(TimeoutError("read timed out")))
    r = call_audio_endpoint(c, path)
    assert r.status_code == 504 and r.json()["error"]["type"] == "upstream_timeout"
    assert (store.usage[-1].status, store.usage[-1].audio_seconds) == (504, 0.0)


@pytest.mark.parametrize("path, call", [("/v1/translate", "translate"), ("/v1/converse", "converse")])
def test_silence_is_a_422_nothing_heard_counted_at_zero(env, path, call):
    c, store, up, *_ = env
    setattr(up, call, lambda *a, **k: gw.UpstreamReply(422, b'{"error": "nothing was heard"}'))
    r = call_audio_endpoint(c, path)
    assert r.status_code == 422 and r.json()["error"]["type"] == "nothing_heard"
    assert (store.usage[-1].status, store.usage[-1].audio_seconds) == (422, 0.0)


def test_a_transcribe_422_is_its_own_failure_not_silence(env):
    # namu-transcribe answers 422 for anything that breaks while decoding, GPU errors included
    c, store, up, *_ = env
    up.transcribe = lambda *a, **k: gw.UpstreamReply(422, b'{"error": "CUDA error"}')
    r = call_audio_endpoint(c, "/v1/transcribe")
    assert r.status_code == 502 and "CUDA" not in r.text


@pytest.mark.parametrize("path, call", AUDIO_CALLS)
@pytest.mark.parametrize("content", [b"<html>gateway timeout</html>", b'["not", "an", "object"]', b""])
def test_an_answer_that_is_not_a_json_object_is_a_502(env, path, call, content):
    c, store, up, *_ = env
    setattr(up, call, lambda *a, **k: gw.UpstreamReply(200, content, "text/html"))
    r = call_audio_endpoint(c, path)
    assert r.status_code == 502 and r.json()["error"]["type"] == "upstream_error"
    assert (store.usage[-1].status, store.usage[-1].audio_seconds) == (502, 0.0)


def test_speech_that_is_not_audio_is_a_502(env):
    c, store, up, *_ = env
    up.speak = lambda *a, **k: gw.UpstreamReply(200, b'{"status": "warm"}', "application/json")
    assert call_speech(c).status_code == 502



def test_the_wait_fits_who_is_asking(env):
    c, store, up, *_ = env
    post_audio(c, "/v1/transcribe", key=DEMO)
    post_audio(c, "/v1/transcribe")
    c.post("/v1/transcribe", headers=as_account("dev-1"), files={"file": ("a.wav", wav(), "audio/wav")})
    assert up.budgets == [gw.UPSTREAM_TIMEOUT_S["demo"], gw.UPSTREAM_TIMEOUT_S["api"],
                          gw.UPSTREAM_TIMEOUT_S["playground"]]


# ---------------------------------------------------------------- the real HTTP client, against a fake Modal
URLS = {name: f"https://{name}.modal.test" for name in ("transcribe", "voice", "interpret", "agent")}


def modal_upstream(handler):
    return gw.ModalUpstream(URLS, "wk-test", "ws-test", transport=httpx.MockTransport(handler))


@pytest.fixture
def no_jitter(monkeypatch):
    monkeypatch.setattr(gw.random, "uniform", lambda a, b: 0.0)


def test_a_long_call_follows_modals_303_to_the_result():
    seen = []

    def handler(request):
        seen.append((request.method, request.url.params.get("__result"), request.headers.get("modal-key")))
        if "__result" not in request.url.params:
            return httpx.Response(303, headers={"location": "/v1/speech?__result=1"})
        return httpx.Response(200, json={"source_text": "sannu", "target_text": "bonjour"})
    reply = modal_upstream(handler).translate(wav(), "ha", "fr", 60)
    assert reply.status == 200 and reply.json()["target_text"] == "bonjour"
    assert seen == [("POST", None, "wk-test"), ("GET", "1", "wk-test")]


def test_a_redirect_to_another_host_is_not_followed():
    hosts = []

    def handler(request):
        hosts.append(request.url.host)
        return httpx.Response(303, headers={"location": "https://elsewhere.example/steal"})
    reply = modal_upstream(handler).translate(wav(), "ha", "fr", 60)
    assert reply.status == 303 and hosts == ["interpret.modal.test"]      # the token never left



@pytest.mark.parametrize("location", ["http://interpret.modal.test/v1/speech?__result=1",
                                      "https://interpret.modal.test:8443/v1/speech?__result=1"])
def test_a_redirect_that_changes_scheme_or_port_is_not_followed(location):
    seen = []

    def handler(request):
        seen.append(str(request.url))
        return httpx.Response(303, headers={"location": location})
    assert modal_upstream(handler).translate(wav(), "ha", "fr", 60).status == 303 and len(seen) == 1


class FakeMonotonic:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t


def test_the_budget_covers_every_hop_together():
    clock, hops = FakeMonotonic(), []

    def handler(request):
        hops.append(request.method)
        clock.t += 100                                 # each hop waits 100 s before its 303
        return httpx.Response(303, headers={"location": "/v1/speech?__result=1"})
    up = gw.ModalUpstream(URLS, "wk", "ws", transport=httpx.MockTransport(handler), clock=clock)
    with pytest.raises(gw.UpstreamTimeout):
        up.translate(wav(), "ha", "fr", 250)
    assert hops == ["POST", "GET", "GET"]              # 300 s spent; a fourth hop would pass 250


def test_a_chain_of_redirects_stops_at_modals_limit():
    hops = []

    def handler(request):
        hops.append(1)
        return httpx.Response(303, headers={"location": "/v1/speech?__result=1"})
    reply = modal_upstream(handler).translate(wav(), "ha", "fr", 60)
    assert reply.status == 303 and len(hops) == 1 + gw.ModalUpstream.MAX_HOPS


def test_the_budget_runs_from_the_requests_arrival():
    store, up, clock = FakeStore(), FakeUpstream(), Clock()

    def slow_probe(data):
        clock.t += 30                                  # thirty seconds spent before the model is called
        return gw.wav_seconds(data)
    c = TestClient(gw.create_app(store, up, FakeLimiter(), PEPPER, audio_seconds=slow_probe, now=clock))
    post_audio(c, "/v1/transcribe")
    assert up.budgets == [gw.UPSTREAM_TIMEOUT_S["api"] - 30]


def test_a_read_timeout_is_an_upstream_timeout():
    def handler(request):
        raise httpx.ReadTimeout("read timed out", request=request)
    with pytest.raises(gw.UpstreamTimeout):
        modal_upstream(handler).transcribe(wav(), "ha", 60)


def test_no_time_left_is_an_upstream_timeout():
    with pytest.raises(gw.UpstreamTimeout):
        modal_upstream(lambda request: httpx.Response(200, json={})).transcribe(wav(), "ha", 0)


def test_a_failed_connection_is_retried_once(no_jitter):
    attempts = []

    def handler(request):
        attempts.append(request.method)
        if len(attempts) == 1:
            raise httpx.ConnectError("connection refused", request=request)
        return httpx.Response(200, json={"text": "sannu"})
    assert modal_upstream(handler).transcribe(wav(), "ha", 60).json() == {"text": "sannu"}
    assert attempts == ["POST", "POST"]


def test_other_failures_are_not_retried():
    attempts = []

    def handler(request):
        attempts.append(1)
        raise httpx.RemoteProtocolError("server hung up", request=request)    # the model may have started
    with pytest.raises(httpx.RemoteProtocolError):
        modal_upstream(handler).transcribe(wav(), "ha", 60)
    assert len(attempts) == 1


def gateway_with(handler):
    store = FakeStore()
    app = gw.create_app(store, modal_upstream(handler), FakeLimiter(), PEPPER, audio_seconds=gw.wav_seconds)
    return TestClient(app), store


def test_end_to_end_connect_error_is_a_502_envelope_with_a_zero_second_row(no_jitter):
    def handler(request):
        raise httpx.ConnectError("connection refused", request=request)
    c, store = gateway_with(handler)
    r = post_audio(c, "/v1/transcribe", seconds=5.0)
    assert r.status_code == 502 and r.json()["error"]["type"] == "upstream_error"
    assert (store.usage[-1].status, store.usage[-1].audio_seconds) == (502, 0.0)


def test_end_to_end_read_timeout_is_a_504_envelope_with_a_zero_second_row():
    def handler(request):
        raise httpx.ReadTimeout("read timed out", request=request)
    c, store = gateway_with(handler)
    r = post_audio(c, "/v1/translate", seconds=5.0)
    assert r.status_code == 504 and r.json()["error"]["type"] == "upstream_timeout"
    assert (store.usage[-1].status, store.usage[-1].audio_seconds) == (504, 0.0)


def test_end_to_end_a_303_is_followed_and_charged_once():
    def handler(request):
        if "__result" not in request.url.params:
            return httpx.Response(303, headers={"location": "/v1/speech?__result=1"})
        return httpx.Response(200, json={"source_text": "sannu", "target_text": "bonjour"})
    c, store = gateway_with(handler)
    r = post_audio(c, "/v1/translate", seconds=5.0)
    assert r.status_code == 200 and r.json()["text"] == "bonjour"
    assert [(u.status, u.audio_seconds) for u in store.usage] == [(200, 5.0)]


# ---------------------------------------------------------------- what counts against the allowance
@pytest.mark.parametrize("endpoint, expected", [
    ("transcribe", 3.0), ("speech", 2.0), ("translate", 3.0), ("converse", 5.0)])
def test_a_success_counts_by_the_one_rule(endpoint, expected):
    assert gw.billable_seconds(endpoint, 200, sent_s=3.0, returned_s=2.0) == expected


@pytest.mark.parametrize("endpoint", ["transcribe", "speech", "translate", "converse"])
@pytest.mark.parametrize("status", [400, 422, 429, 500, 502, 504])
def test_a_failure_counts_nothing(endpoint, status):
    assert gw.billable_seconds(endpoint, status, sent_s=3.0, returned_s=2.0) == 0.0



def test_a_negative_length_never_becomes_a_credit():
    assert gw.billable_seconds("transcribe", 200, sent_s=-5000.0) == 0.0
    assert gw.billable_seconds("converse", 200, sent_s=-5000.0, returned_s=2.0) == 0.0

@pytest.mark.parametrize("path, call", [("/v1/translate", "translate"), ("/v1/converse", "converse")])
def test_failed_translate_and_converse_are_recorded_at_zero_seconds(env, path, call):
    c, store, up, *_ = env
    setattr(up, call, lambda *a, **k: gw.UpstreamReply(500, b"boom"))
    r = post_audio(c, path, seconds=30.0)
    assert r.status_code == 502
    u = store.usage[-1]
    assert (u.endpoint, u.status, u.audio_seconds) == (call, 502, 0.0)


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



@pytest.mark.parametrize("body", [["Sannu"], "Sannu", 5, {"text": 5}, {"text": ["Sannu"]},
                                  {"text": "Sannu", "voice": ["nadia"]}, {"text": "Sannu", "voice": 7}])
def test_speech_refuses_json_that_is_not_an_object_of_strings(env, body):
    c, store, up, *_ = env
    r = c.post("/v1/speech", headers=auth(), json=body)
    assert r.status_code == 400 and r.json()["error"]["type"] == "invalid_json"
    assert up.calls == []


def test_speech_refuses_a_body_that_is_not_json(env):
    c, *_ = env
    r = c.post("/v1/speech", headers={**auth(), "Content-Type": "application/json"}, content=b"{not json")
    assert r.status_code == 400 and r.json()["error"]["type"] == "invalid_json"


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



# ---------------------------------------------------------------- one envelope, one request id
def test_every_answer_carries_a_request_id(env):
    c, *_ = env
    a, b = c.get("/v1/health"), c.post("/v1/transcribe")
    assert len(a.headers["x-request-id"]) == 32 and a.headers["x-request-id"] != b.headers["x-request-id"]
    assert b.json()["error"]["request_id"] == b.headers["x-request-id"]


def test_unknown_route_is_a_404_envelope(env):
    c, *_ = env
    r = c.get("/v2/speech")
    assert r.status_code == 404 and r.json()["error"]["type"] == "not_found"
    assert r.json()["error"]["request_id"] == r.headers["x-request-id"]


def test_wrong_method_is_a_405_envelope(env):
    c, *_ = env
    r = c.get("/v1/speech")
    assert r.status_code == 405 and r.json()["error"]["type"] == "method_not_allowed"
    assert "POST" in r.headers["allow"]



def test_a_multipart_body_that_cannot_be_parsed_is_a_400_envelope(env):
    c, store, up, *_ = env
    r = c.post("/v1/transcribe", content=b"--xyz\r\nnot a part",
               headers={**auth(), "Content-Type": "multipart/form-data; boundary=xyz"})
    assert r.status_code == 400 and r.json()["error"]["type"] == "invalid_request"
    assert up.calls == []


def test_an_unexpected_failure_is_a_500_envelope(env):
    store, up = FakeStore(), FakeUpstream()

    class BrokenLimiter:
        def hit(self, *a):
            raise RuntimeError("limiter down: secret detail")
    c = TestClient(gw.create_app(store, up, BrokenLimiter(), PEPPER, audio_seconds=gw.wav_seconds),
                   raise_server_exceptions=False)
    r = post_audio(c, "/v1/transcribe")
    assert r.status_code == 500 and r.json()["error"]["type"] == "internal_error"
    assert r.json()["error"]["request_id"] == r.headers["x-request-id"]
    assert "secret detail" not in r.text


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


# ---------------------------------------------------------------- /v1/usage takes the same key checks
def test_usage_reports_the_month(env):
    c, store, *_ = env
    store.keys[gw.hash_key(GOOD, PEPPER)].used_audio_seconds = 61.26
    assert c.get("/v1/usage", headers=auth()).json() == {"month_audio_seconds_used": 61.3,
                                                          "month_audio_seconds_limit": 1800}


def test_usage_checks_the_key_shape_before_any_lookup(env):
    c, store, *_ = env
    r = c.get("/v1/usage", headers=auth("sk-not-ours"))
    assert r.status_code == 401 and r.json()["error"]["type"] == "invalid_api_key"
    assert store.lookups == 0


def test_usage_refuses_a_paused_account(env):
    c, store, *_ = env
    store.keys[gw.hash_key(GOOD, PEPPER)].beta_status = "denied"
    r = c.get("/v1/usage", headers=auth())
    assert r.status_code == 403 and r.json()["error"]["type"] == "account_paused"
    r = c.get("/v1/usage", headers=as_account("paused-1"))
    assert r.status_code == 403 and r.json()["error"]["type"] == "account_paused"


def test_usage_refuses_a_revoked_key(env):
    c, store, *_ = env
    store.keys[gw.hash_key(GOOD, PEPPER)].revoked = True
    assert c.get("/v1/usage", headers=auth()).json()["error"]["type"] == "key_revoked"


def test_usage_answers_even_when_the_allowance_is_used(env):
    c, *_ = env
    assert c.get("/v1/usage", headers=as_account("full-1")).status_code == 200


# ---------------------------------------------------------------- made-up keys
def unknown_key(i: int) -> str:
    return "namu_sk_" + f"{i:043d}"


def test_an_unknown_key_is_remembered_for_the_cache_ttl(env):
    c, store, up, lim, clock = env
    for _ in range(3):
        assert post_audio(c, "/v1/transcribe", key=unknown_key(1)).status_code == 401
    assert store.lookups == 1
    clock.t += gw.KEY_CACHE_TTL + 1
    post_audio(c, "/v1/transcribe", key=unknown_key(1))
    assert store.lookups == 2


def test_a_key_created_after_a_miss_works_once_the_miss_expires(env):
    c, store, up, lim, clock = env
    new = unknown_key(7)
    assert post_audio(c, "/v1/transcribe", key=new).status_code == 401
    store.keys[gw.hash_key(new, PEPPER)] = replace(BASE, key_id="k7")
    clock.t += gw.KEY_CACHE_TTL + 1
    assert post_audio(c, "/v1/transcribe", key=new).status_code == 200


def test_made_up_keys_hit_a_per_address_limit_before_the_database(env):
    c, store, up, lim, clock = env
    assert post_audio(c, "/v1/transcribe").status_code == 200              # a real key, now cached
    n = gw.KEY_LOOKUPS_PER_ADDRESS_PER_MIN
    for i in range(n - 1):
        assert c.get("/v1/usage", headers=auth(unknown_key(i))).status_code == 401
    r = c.get("/v1/usage", headers=auth(unknown_key(n)))
    assert r.status_code == 429 and r.json()["error"]["type"] == "rate_limited"
    assert "retry-after" in r.headers and store.lookups == n
    assert post_audio(c, "/v1/transcribe").status_code == 200              # cached keys need no lookup
    other = TestClient(c.app, client=("198.51.100.9", 50000))
    assert other.get("/v1/usage", headers=auth(unknown_key(n + 1))).status_code == 401
    clock.t += 60
    assert c.get("/v1/usage", headers=auth(unknown_key(n + 2))).status_code == 401   # a new minute


def test_the_memory_of_unknown_keys_is_bounded(env, monkeypatch):
    c, store, up, lim, clock = env
    monkeypatch.setattr(gw, "UNKNOWN_KEYS_REMEMBERED", 3)
    for i in range(5):
        post_audio(c, "/v1/transcribe", key=unknown_key(100 + i))
    post_audio(c, "/v1/transcribe", key=unknown_key(100))                  # forgotten, so looked up again
    assert store.lookups == 6


def test_ipv6_callers_are_counted_by_their_64():
    assert gw.address_bucket("2001:db8:1:2::1") == gw.address_bucket("2001:db8:1:2:ffff::9")
    assert gw.address_bucket("2001:db8:1:2::1") != gw.address_bucket("2001:db8:1:3::1")
    assert gw.address_bucket("203.0.113.7") == "203.0.113.7"
    assert gw.address_bucket("::ffff:203.0.113.7") == "203.0.113.7"          # not one bucket for every IPv4 caller
    assert gw.address_bucket("::ffff:203.0.113.7") != gw.address_bucket("::ffff:198.51.100.9")
    assert gw.address_bucket(None) == "unknown"


def test_the_window_counter_resets_each_window_and_stays_bounded():
    clock = Clock()
    w = gw.WindowCounter(clock, max_buckets=2)
    assert [w.hit("a", 2, 60)[0] for _ in range(3)] == [True, True, False]
    clock.t += 60
    assert w.hit("a", 2, 60)[0]
    w.hit("b", 2, 60)
    w.hit("c", 2, 60)
    assert len(w.counts) <= 2


# ---------------------------------------------------------------- speech formats
@pytest.fixture
def enc_env():
    store, up, lim, clock = FakeStore(), FakeUpstream(), FakeLimiter(), Clock()
    seen, broken = [], set()

    def encode(data, fmt):
        seen.append(fmt)
        return None if fmt in broken else {"mp3": b"ID3fake", "opus": b"OggSfake"}[fmt]

    app = gw.create_app(store, up, lim, PEPPER, audio_seconds=lambda b: gw.wav_seconds(b), encode=encode, now=clock)
    return TestClient(app), store, up, seen, broken


def test_speech_is_wav_by_default(enc_env):
    c, store, up, seen, broken = enc_env
    r = c.post("/v1/speech", headers=auth(), json={"text": "Sannu", "voice": "nadia"})
    assert r.status_code == 200 and r.headers["content-type"] == "audio/wav" and seen == []


@pytest.mark.parametrize("fmt,ctype,head", [("mp3", "audio/mpeg", b"ID3"), ("opus", "audio/ogg", b"OggS")])
def test_speech_in_another_format(enc_env, fmt, ctype, head):
    c, store, up, seen, broken = enc_env
    r = c.post("/v1/speech", headers=auth(), json={"text": "Sannu", "voice": "nadia", "format": fmt})
    assert r.status_code == 200
    assert r.headers["content-type"] == ctype and r.content.startswith(head)
    assert float(r.headers["x-audio-seconds"]) == 2.0
    assert seen == [fmt] and store.usage[-1].audio_seconds == 2.0


def test_speech_unknown_format_is_refused_before_the_model(enc_env):
    c, store, up, seen, broken = enc_env
    r = c.post("/v1/speech", headers=auth(), json={"text": "Sannu", "format": "flac"})
    assert r.status_code == 400 and r.json()["error"]["type"] == "invalid_request"
    assert up.calls == [] and store.usage == []


def test_speech_encode_failure_is_an_error_and_counts_nothing(enc_env):
    c, store, up, seen, broken = enc_env
    broken.add("mp3")
    r = c.post("/v1/speech", headers=auth(), json={"text": "Sannu", "format": "mp3"})
    assert r.status_code == 500 and r.json()["error"]["type"] == "encode_failed"
    assert (store.usage[-1].status, store.usage[-1].audio_seconds) == (500, 0.0)


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg is not installed here")
@pytest.mark.parametrize("fmt", ["mp3", "opus"])
def test_encode_audio_with_ffmpeg(fmt):
    out = gw.encode_audio(wav(1.0, 24000), fmt)
    assert out
    assert out.startswith(b"OggS") if fmt == "opus" else (out.startswith(b"ID3") or out[0] == 0xFF)


def test_encode_audio_refuses_unknown_formats():
    assert gw.encode_audio(wav(0.2), "flac") is None


# ---------------------------------------------------------------- text translation
def test_translate_text(env):
    c, store, up, *_ = env
    r = c.post("/v1/translate", headers=auth(), json={"text": "Bonjour à tous", "source": "fr", "target": "ha"})
    assert r.status_code == 200
    j = r.json()
    assert j["text"] == "Sannu da zuwa" and j["source_text"] == "Bonjour à tous" and j["characters"] == 14
    assert "audio" not in j
    assert up.calls == [("translate_text", "fr", "ha")]
    u = store.usage[-1]
    assert (u.endpoint, u.characters, u.audio_seconds, u.status) == ("translate", 14, 0.0, 200)


def test_translate_text_spoken(env):
    c, store, up, *_ = env
    r = c.post("/v1/translate?include_audio=1", headers=auth(), json={"text": "Bonjour", "target": "ha"})
    assert r.status_code == 200 and r.json()["audio"]
    assert up.calls == [("translate_text", "fr", "ha"), ("speak", "ha", "nadia")]


@pytest.mark.parametrize("body,status,kind", [
    ({"text": "", "target": "ha"}, 400, "missing_text"),
    ({"text": "x", "source": "en", "target": "ha"}, 400, "unsupported_pair"),
    ({"text": "x", "source": "ha", "target": "ha"}, 400, "unsupported_pair"),
    ({"text": "x" * 2001, "target": "ha"}, 413, "text_too_long"),
    ({"text": ["x"]}, 400, "invalid_json"),
])
def test_translate_text_refusals(env, body, status, kind):
    c, store, up, *_ = env
    r = c.post("/v1/translate", headers=auth(), json=body)
    assert r.status_code == status and r.json()["error"]["type"] == kind
    assert up.calls == []


def test_translate_text_needs_the_scope(env):
    c, store, *_ = env
    store.keys[gw.hash_key(GOOD, PEPPER)].scopes = ["speech"]
    r = c.post("/v1/translate", headers=auth(), json={"text": "Bonjour", "target": "ha"})
    assert r.status_code == 403 and r.json()["error"]["type"] == "insufficient_scope"
