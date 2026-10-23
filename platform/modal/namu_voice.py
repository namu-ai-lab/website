"""Namu-Voice — speech synthesis.

    modal deploy namu_voice.py

Two models in one container, routed by `language`:
  ha  -> Namuorg/tenere-omnivoice-hausa  (our Hausa fine-tune, Tenere)
  fr  -> k2-fsa/OmniVoice base           (French reference voices)

Both are OmniVoice, so they share the runtime; the Hausa fine-tune is kept
separate rather than used for French because cloning across languages bleeds
accent. The French side is what makes Namu-Interpret able to speak the FR half,
so it lives here rather than in a second service.

    POST /v1/speak   {"text": "...", "language": "ha"}  -> audio/wav
    POST /v1/warm    empty                              -> {"status": "warm"}
    GET  /v1/health                                     -> voices + models

The French load is wrapped in try/except on purpose: if the weights volume or a
reference clip is missing, the service degrades to Hausa-only instead of failing
to boot. Hausa is the primary product; French is the interpreter's second half.
"""

import modal
from fastapi import Request

KURA = "Namuorg/tenere-omnivoice-hausa"   # moved + renamed from Abdoul27/kura-omnivoice-hausa
BASE = "k2-fsa/OmniVoice"
KURA_DIR = "/kura"
BASE_DIR = "/omni"
VOL = "/weights"
REFS = f"{VOL}/refs"

SAMPLE_RATE = 24000     # OmniVoice output rate
MIN_CONTAINERS = 0

app = modal.App("namu-voice")

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
    import os

    from huggingface_hub import snapshot_download

    snapshot_download(KURA, local_dir=KURA_DIR, token=os.environ.get("HF_TOKEN"))
    snapshot_download(BASE, local_dir=BASE_DIR)


image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "git", "build-essential")
    .pip_install(
        "torch", "torchaudio", "soundfile", "numpy<2",
        "huggingface_hub>=0.24", "omnivoice", "fastapi[standard]",
    )
    .run_function(_download, secrets=[modal.Secret.from_name("huggingface-token")])
)

vol = modal.Volume.from_name("namu-voice-refs")   # only /refs is used: the voice samples

with image.imports():
    import io
    import json
    import os
    import time

    import numpy as np
    import soundfile as sf
    import torch
    from omnivoice import OmniVoice


@app.cls(
    image=image, gpu="A10", volumes={VOL: vol}, max_containers=2,
    scaledown_window=600, min_containers=MIN_CONTAINERS, timeout=900,
)
class Voice:
    @modal.enter()
    def load(self):
        t = time.time()

        # --- Hausa: our fine-tune. Nadia is the reference clip shipped in the
        # repo — a length-mismatched reference caused excess leading silence on
        # the related CosyVoice2 fine-tune, so use the one the author
        # calibrated. Salim is a cloned voice on the volume; cloning runs
        # through the SAME Hausa fine-tune, so it stays a Hausa speaker rather
        # than a Hausa accent on a general model.
        self.kura = OmniVoice.from_pretrained(
            KURA_DIR, device_map="cuda:0", dtype=torch.float16)
        meta = json.load(open(f"{KURA_DIR}/reference_voice/reference.json",
                              encoding="utf-8"))
        self.ha_steps = int(meta.get("num_step_recommended", 32))
        self.ha_voices = {
            "nadia": (f"{KURA_DIR}/reference_voice/reference.wav",
                      meta.get("ref_text", "")),
        }
        for vid in ("salim",):
            wav = f"{REFS}/custom/{vid}_ha.wav"
            txt = f"{REFS}/custom/{vid}_ha.txt"
            if os.path.exists(wav) and os.path.exists(txt):
                self.ha_voices[vid] = (
                    wav, open(txt, encoding="utf-8").read().strip())
            else:
                print(f"Hausa voice {vid!r} missing at {wav}", flush=True)
        self.ha_default = "nadia"

        # --- French: base OmniVoice + the FLEURS reference gallery on the volume.
        self.base = None
        self.fr_voices = {}
        try:
            self.base = OmniVoice.from_pretrained(
                BASE_DIR, device_map="cuda:0", dtype=torch.float16)
            gallery = f"{REFS}/fr_voices.json"
            if os.path.exists(gallery):
                for m in json.load(open(gallery, encoding="utf-8")):
                    self.fr_voices[m["id"]] = (f"{REFS}/{m['file']}", m["text"])
            # Only *_fr.wav — the custom folder also holds Hausa references
            # (salim_ha.wav), and an unfiltered scan put a Hausa speaker in the
            # French voice list.
            custom = f"{REFS}/custom"
            if os.path.isdir(custom):
                for f in sorted(os.listdir(custom)):
                    if not f.endswith("_fr.wav"):
                        continue
                    txt = os.path.join(custom, f[:-4] + ".txt")
                    if os.path.exists(txt):
                        self.fr_voices[f[:-4]] = (
                            os.path.join(custom, f),
                            open(txt, encoding="utf-8").read().strip(),
                        )
            if self.fr_voices:
                # mine_fr is the user's own cloned voice; prefer it as default.
                for pick in ("mine_fr", "fr0"):
                    if pick in self.fr_voices:
                        self.fr_voices["fr"] = self.fr_voices[pick]
                        break
        except Exception as e:
            print(f"French side unavailable ({type(e).__name__}: {e}) — "
                  f"serving Hausa only", flush=True)
            self.base = None

        self._say("Sannu.", "ha", "nadia")  # warm the Hausa kernels
        if self.base and "fr" in self.fr_voices:
            try:
                self._say("Bonjour.", "fr")
            except Exception as e:
                print(f"French warmup failed: {e}", flush=True)

        print(f"ready in {time.time() - t:.1f}s | "
              f"ha={sorted(self.ha_voices)} fr={sorted(self.fr_voices)}", flush=True)

    def _say(self, text: str, language: str = "ha",
             voice: str | None = None, num_step: int | None = None):
        if language == "fr":
            if not self.base or not self.fr_voices:
                raise RuntimeError("French synthesis is not available on this container")
            ref_wav, ref_text = self.fr_voices.get(voice or "fr",
                                                   self.fr_voices["fr"])
            model, steps = self.base, int(num_step or 32)
        else:
            ref_wav, ref_text = self.ha_voices.get(
                voice or self.ha_default, self.ha_voices[self.ha_default])
            model, steps = self.kura, int(num_step or self.ha_steps)

        t = time.time()
        a = model.generate(text=text, ref_audio=ref_wav, ref_text=ref_text,
                           num_step=steps)
        secs = time.time() - t

        a = a[0] if hasattr(a, "__getitem__") else a
        a = np.asarray(a, dtype="float32")
        # OmniVoice clones the reference's LEVEL as well as its voice — a quiet
        # reference once produced -45 dBFS output that was inaudible at full
        # volume. Peak-normalise so level never depends on the reference clip.
        peak = float(np.max(np.abs(a)))
        if peak > 1e-6:
            a = a * (0.95 / peak)

        buf = io.BytesIO()
        sf.write(buf, a, SAMPLE_RATE, format="WAV")
        return buf.getvalue(), secs, steps

    @modal.method()
    def speak(self, text: str, language: str = "ha", voice: str | None = None) -> bytes:
        return self._say(text, language, voice)[0]

    @modal.asgi_app(requires_proxy_auth=REQUIRE_PROXY_AUTH)
    def api(self):
        from fastapi import FastAPI
        from fastapi.responses import JSONResponse, Response

        web = FastAPI(title="Namu-Voice", version="1.0",
                      description="Hausa and French speech synthesis.")
        # No CORS on purpose: only Namu's servers call this service, with the proxy
        # token, and that token must never reach a browser.

        @web.get("/v1/health")
        def health():
            return {"service": "Namu-Voice", "task": "speech-synthesis",
                    "sample_rate": SAMPLE_RATE,
                    "models": {"ha": KURA,
                               "fr": BASE if self.base else None},
                    "voices": {"ha": sorted(self.ha_voices),
                               "fr": sorted(self.fr_voices)},
                    "default_voice": {"ha": self.ha_default, "fr": "fr"},
                    "num_step_default": self.ha_steps,
                    "container": os.environ.get("MODAL_TASK_ID", "?")}

        @web.post("/v1/warm")
        async def warm():
            return {"status": "warm", "container": os.environ.get("MODAL_TASK_ID", "?")}

        @web.post("/v1/speak")
        async def speak(request: Request):
            """Returns audio/wav. Pass {"format": "json"} for base64 instead."""
            body = await request.json() if await request.body() else {}
            text = (body.get("text") or "").strip()
            if not text:
                return JSONResponse({"status": "warm",
                                     "voices": {"ha": sorted(self.ha_voices),
                                                "fr": sorted(self.fr_voices)}})
            try:
                wav, secs, steps = self._say(
                    text, body.get("language", "ha"),
                    body.get("voice"), body.get("num_step"))
            except Exception as e:
                return JSONResponse({"error": f"{type(e).__name__}: {e}"},
                                    status_code=503)

            if body.get("format") == "json":
                import base64

                return JSONResponse({"audio": base64.b64encode(wav).decode(),
                                     "sample_rate": SAMPLE_RATE,
                                     "seconds": round(secs, 3)})
            return Response(content=wav, media_type="audio/wav",
                            headers={"X-Synth-Seconds": f"{secs:.2f}",
                                     "X-Num-Step": str(steps)})

        return web
