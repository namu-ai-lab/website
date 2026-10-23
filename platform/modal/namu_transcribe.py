"""Namu-Transcribe — Hausa speech recognition.

    modal deploy namu_transcribe.py

Model: NCAIR1/Hausa-ASR (Whisper), the model retained after the four-way arena.

    POST /v1/transcribe   raw audio body OR multipart `file`  -> JSON
    POST /v1/warm         empty                               -> {"status": "warm"}
    GET  /v1/health                                           -> model card

Served as an ASGI app rather than a bare fastapi_endpoint so the routes carry
real paths — the LiveKit plugin, the browser demos and curl all hit one base URL.

Cold-start handling is inherited from the CLEAR-Global service and is load
bearing: weights are baked into the image at build time, restored from a memory
snapshot on the CPU, then moved to GPU, and the warmup runs through the FULL
request path starting from bytes. Warming only the decoder is not enough —
librosa is numba-backed and its first call JIT-compiles for ~22s, which shows up
as handler time on the first real request rather than as container boot.
"""

import modal
from fastapi import Request  # module level: the annotation is evaluated at
                             # definition time, and without it FastAPI treats
                             # `request` as a query param and every POST 422s.

MODEL_ID = "NCAIR1/Hausa-ASR"
MODEL_DIR = "/model"
SAMPLE_RATE = 16000

# Whisper's receptive field. Do NOT lower this: a 10s value was tried to help
# 25s+ passages and badly regressed normal use, because it splits ordinary
# utterances mid-word and the fragment transcribes as noise.
CHUNK_SECONDS = 30

# 1 keeps a GPU permanently warm (no cold start, bills continuously).
# 0 scales to zero — cheap, but the first request after an idle gap pays boot.
MIN_CONTAINERS = 0

app = modal.App("namu-transcribe")

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


def _download():
    """Build time, so weights are in the image rather than fetched on cold start."""
    import os

    from huggingface_hub import snapshot_download

    p = snapshot_download(
        MODEL_ID, local_dir=MODEL_DIR, token=os.environ.get("HF_TOKEN"),
        ignore_patterns=["optimizer.pt", "scheduler.pt", "rng_state*",
                         "scaler.pt", "training_args.bin", "*.msgpack", "*.h5"],
    )
    total = sum(f.stat().st_size for f in __import__("pathlib").Path(p).rglob("*")
                if f.is_file())
    print(f"{MODEL_ID}: {total / 1e9:.2f} GB", flush=True)


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")  # librosa/soundfile need it for mp3/ogg/webm
    .pip_install(
        "torch>=2.4,<3", "transformers>=4.44,<5", "huggingface_hub>=0.24",
        "librosa>=0.10", "soundfile>=0.12", "numpy<2", "fastapi[standard]",
    )
    .run_function(_download, secrets=[modal.Secret.from_name("huggingface-token")])
)

with image.imports():
    import io
    import subprocess
    import time
    import wave

    import librosa
    import numpy as np
    import torch
    from transformers import WhisperForConditionalGeneration, WhisperProcessor


def _load_audio(raw: bytes):
    """Decode any container the caller throws at us, at SAMPLE_RATE, mono.

    librosa.load goes through libsndfile, which handles wav/flac/ogg but NOT
    webm/opus or mp4/aac — and those are exactly what MediaRecorder produces in
    Chrome and Safari. Recent librosa also dropped the old audioread fallback,
    so an in-browser recording arrives here and raises. ffmpeg is already in the
    image for exactly this reason; shell out to it rather than constrain what
    clients may send.
    """
    try:
        audio, _ = librosa.load(io.BytesIO(raw), sr=SAMPLE_RATE, mono=True)
        if audio.size:
            return audio
    except Exception:
        pass

    p = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", "pipe:0",
         "-f", "f32le", "-ac", "1", "-ar", str(SAMPLE_RATE), "pipe:1"],
        input=raw, capture_output=True,
    )
    if p.returncode != 0 or not p.stdout:
        raise ValueError(
            "could not decode this audio: "
            + (p.stderr.decode("utf-8", "replace")[:200] or "empty output")
        )
    return np.frombuffer(p.stdout, dtype=np.float32).copy()


@app.cls(
    image=image,
    gpu="A10",
    max_containers=2,          # hard cost ceiling, whatever the traffic
    scaledown_window=300,
    enable_memory_snapshot=True,
    min_containers=MIN_CONTAINERS,
    timeout=900,
)
class Transcribe:
    @modal.enter(snap=True)
    def load_to_cpu(self):
        """Before the snapshot is taken — must not touch CUDA."""
        self.dtype = torch.float16
        self.processor = WhisperProcessor.from_pretrained(MODEL_DIR)
        self.model = WhisperForConditionalGeneration.from_pretrained(
            MODEL_DIR, torch_dtype=self.dtype
        ).eval()

    @modal.enter(snap=False)
    def move_to_gpu(self):
        """Every restore. The snapshot already holds the weights in RAM."""
        self.model.to("cuda")

        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SAMPLE_RATE)
            w.writeframes(b"\x00" * (2 * SAMPLE_RATE))
        # Cap the token budget: Whisper hallucinates on pure silence and would
        # otherwise generate to max_length, adding ~15s to every container boot.
        self._from_bytes(buf.getvalue(), max_new_tokens=4)

    def _decode(self, audio, language="ha", max_new_tokens=None) -> str:
        feats = self.processor(
            audio, sampling_rate=SAMPLE_RATE, return_tensors="pt"
        ).input_features.to("cuda", dtype=self.dtype)
        kw = {"max_new_tokens": max_new_tokens} if max_new_tokens else {}
        with torch.inference_mode():
            ids = self.model.generate(feats, language=language, task="transcribe", **kw)
        return self.processor.batch_decode(ids, skip_special_tokens=True)[0].strip()

    def _from_bytes(self, raw: bytes, language="ha", max_new_tokens=None):
        audio = _load_audio(raw)
        window = CHUNK_SECONDS * SAMPLE_RATE
        if len(audio) <= window:
            return self._decode(audio, language, max_new_tokens), len(audio) / SAMPLE_RATE
        parts = [
            self._decode(audio[i:i + window], language, max_new_tokens)
            for i in range(0, len(audio), window)
        ]
        return " ".join(p for p in parts if p), len(audio) / SAMPLE_RATE

    @modal.method()
    def transcribe(self, audio_bytes: bytes, language: str = "ha") -> str:
        return self._from_bytes(audio_bytes, language)[0]

    @modal.asgi_app(requires_proxy_auth=REQUIRE_PROXY_AUTH)
    def api(self):
        import os

        from fastapi import FastAPI

        web = FastAPI(title="Namu-Transcribe", version="1.0",
                      description="Hausa speech recognition.")
        # No CORS on purpose: only Namu's servers call this service, with the proxy
        # token, and that token must never reach a browser.

        @web.get("/v1/health")
        def health():
            return {"service": "Namu-Transcribe", "model": MODEL_ID,
                    "task": "speech-recognition", "languages": ["ha"],
                    "sample_rate": SAMPLE_RATE,
                    "container": os.environ.get("MODAL_TASK_ID", "?")}

        @web.post("/v1/warm")
        async def warm():
            """Boot a container without sending audio.

            Fire this when a session opens; the cold start overlaps the greeting.
            """
            return {"status": "warm", "model": MODEL_ID,
                    "container": os.environ.get("MODAL_TASK_ID", "?")}

        @web.post("/v1/transcribe")
        async def transcribe(request: Request, language: str = "ha"):
            ct = request.headers.get("content-type", "")
            if ct.startswith("multipart/form-data"):
                form = await request.form()
                upload = form.get("file")
                if upload is None:
                    return {"error": "multipart request is missing a 'file' field"}
                raw = await upload.read()
            else:
                raw = await request.body()

            if not raw:
                return {"status": "warm", "model": MODEL_ID}

            t = time.time()
            try:
                text, secs = self._from_bytes(raw, language)
            except Exception as e:
                # A bare exception here surfaces to the caller as an opaque 500.
                # Say what actually failed — usually an undecodable container.
                from fastapi.responses import JSONResponse

                return JSONResponse(
                    {"error": f"{type(e).__name__}: {str(e)[:300]}",
                     "bytes": len(raw)}, status_code=422)
            took = time.time() - t
            return {
                "text": text,
                "language": language,
                "model": MODEL_ID,
                "audio_seconds": round(secs, 2),
                "seconds": round(took, 3),
                "rtf": round(took / secs, 3) if secs else None,
                "container": os.environ.get("MODAL_TASK_ID", "?"),
            }

        return web


@app.local_entrypoint()
def main(audio_path: str):
    """modal run namu_transcribe.py --audio-path clip.wav"""
    with open(audio_path, "rb") as f:
        print(Transcribe().transcribe.remote(f.read()))
