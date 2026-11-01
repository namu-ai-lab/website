"""namu-interpret's spoken output, checked without Modal, a model provider or a GPU.

    python3 -m pytest platform/tests -q

French speech was withdrawn with the French voice (no consent record for its speaker, ROADMAP S3): a translation into
French comes back as text with "audio": null, and namu-voice is never asked to speak it. Hausa is still spoken.
"""

import subprocess
import sys
import types
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "modal"))
import namu_interpret as interpret  # noqa: E402


class _Reply:
    def __init__(self, payload=None, content=b""):
        self.payload, self.content, self.status_code = payload, content, 200

    def raise_for_status(self):
        pass

    def json(self):
        return self.payload


def _completion(text):
    return types.SimpleNamespace(choices=[types.SimpleNamespace(message=types.SimpleNamespace(content=text))])


@pytest.fixture
def app(monkeypatch):
    if not isinstance(interpret.api, types.FunctionType):
        pytest.skip("the real modal package wraps api(); these tests run with the stub in conftest.py")
    calls = []

    def post(url, data=None, json=None, headers=None, timeout=None):
        calls.append((url, json))
        if url.endswith("/v1/transcribe"):
            return _Reply({"text": "Nawa ne farashin buhun gero?"})
        if url.endswith("/v1/speak"):
            return _Reply(content=b"RIFF-fake-wav")
        raise AssertionError(f"unexpected call to {url}")

    class OpenAI:
        def __init__(self, **_):
            self.chat = types.SimpleNamespace(completions=types.SimpleNamespace(create=self._create))

        def _create(self, **kw):
            heard_french = isinstance(kw["messages"][0]["content"], list)     # the French ASR turn carries audio
            return _completion("Quel est le prix du sac de mil ?" if heard_french else "Nawa ne farashin buhun gero?")

    def ffmpeg(cmd, **_):                       # French audio is normalised to WAV before it is heard
        Path(cmd[-1]).write_bytes(b"RIFF-normalised")

    monkeypatch.setitem(sys.modules, "requests", types.SimpleNamespace(post=post))
    monkeypatch.setitem(sys.modules, "openai", types.SimpleNamespace(OpenAI=OpenAI))
    monkeypatch.setattr(subprocess, "run", ffmpeg)
    monkeypatch.setenv("GEMINI_API_KEY", "test")
    return TestClient(interpret.api()), calls


def speak_calls(calls):
    return [j for url, j in calls if url.endswith("/v1/speak")]


def test_a_translation_into_french_is_text_only(app):
    c, calls = app
    r = c.post("/v1/speech?source=ha&target=fr", content=b"RIFF-audio",
               headers={"Content-Type": "application/octet-stream"})
    assert r.status_code == 200 and r.json()["target_text"]
    assert r.json()["audio"] is None
    assert speak_calls(calls) == []                                  # namu-voice was never asked


def test_a_translation_into_hausa_is_still_spoken(app):
    c, calls = app
    r = c.post("/v1/speech?source=fr&target=ha", content=b"RIFF-audio",
               headers={"Content-Type": "application/octet-stream"})
    assert r.status_code == 200 and r.json()["audio"]
    assert [j["language"] for j in speak_calls(calls)] == ["ha"]


def test_only_hausa_is_spoken():
    assert interpret.SPOKEN_TARGETS == ("ha",)
