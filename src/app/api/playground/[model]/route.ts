import type { NextRequest } from "next/server";
import { setting } from "@/lib/env";
import { apiBase } from "@/lib/public-config";
import { fail, signedIn } from "@/lib/http";
import { LIMITS } from "@/lib/limits";
import { isPersona, isVoice } from "@/lib/voices";

/* The console Playground: a signed-in developer tries a model as themselves, as on platform.openai.com. The browser
   never holds a key. This route checks the session, then calls the gateway with the website's service key
   (NAMU_SERVICE_KEY) and names the developer's account (X-Namu-Account): the gateway applies that account's status,
   allowance and rate limit, and the request appears in their usage and logs as "Playground".
     speech      JSON { text, voice }                    → audio/wav
     transcribe  audio body                              → { text, ... }
     translate   audio body, ?target=fr|ha               → { source_text, text, audio } (audio into Hausa only)
     converse    audio body, ?persona=                   → { heard, reply, audio }, one turn, nothing kept
   A voice or persona the API does not serve (lib/voices) is a 400 here, never another voice.
   Audio is passed on in its own container (WAV, WebM/Opus, MP4/AAC, MP3...): the gateway measures any of them with
   ffprobe. Bodies are capped at LIMITS.playgroundUploadMb, under Vercel's 4.5 MB limit on a function's request. */
export const dynamic = "force-dynamic";
export const maxDuration = 300;            // a cold GPU, then up to five minutes of audio

const PATH = { speech: "/v1/speech", transcribe: "/v1/transcribe", translate: "/v1/translate", converse: "/v1/converse" } as const;
type Model = keyof typeof PATH;
const MAX_AUDIO_BYTES = LIMITS.playgroundUploadMb * 1024 * 1024;
const TOO_LARGE = `Audio must be ${LIMITS.playgroundUploadMb} MB or smaller in the Playground. Larger files go through the API.`;

export async function POST(req: NextRequest, { params }: { params: Promise<{ model: string }> }) {
  const { model } = await params;
  if (!Object.hasOwn(PATH, model)) return fail(404, "unknown_model", "Unknown model.");
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const key = setting("NAMU_SERVICE_KEY");
  if (!key) return fail(503, "playground_unavailable", "The Playground is not switched on for this deployment.");

  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, "X-Namu-Account": s.user.id };
  const q = req.nextUrl.searchParams, out = new URLSearchParams();
  let body: BodyInit;
  if (model === "speech") {
    const j = await req.json().catch(() => null) as { text?: unknown; voice?: unknown } | null;
    const text = typeof j?.text === "string" ? j.text.trim() : "";
    if (!text) return fail(400, "missing_text", "Write something to say.");
    if (text.length > LIMITS.textChars) return fail(413, "text_too_long", `Up to ${LIMITS.textChars} characters.`);
    const voice = j?.voice || "nadia";
    if (!isVoice(voice)) return fail(400, "unknown_voice", "Unknown voice. Try nadia.");
    body = JSON.stringify({ text, voice });
    headers["Content-Type"] = "application/json";
  } else {
    const persona = q.get("persona") || "nadia";
    if (model === "converse" && !isPersona(persona)) return fail(400, "unknown_persona", "Unknown persona. Try nadia.");
    if (Number(req.headers.get("content-length") ?? "0") > MAX_AUDIO_BYTES) return fail(413, "payload_too_large", TOO_LARGE);
    const audio = await req.arrayBuffer();
    if (!audio.byteLength) return fail(400, "empty_audio", "The audio was empty.");
    if (audio.byteLength > MAX_AUDIO_BYTES) return fail(413, "payload_too_large", TOO_LARGE);
    body = audio;
    /* the clip's own type (audio/webm;codecs=opus, audio/mp4...), never anything the gateway would parse as a form */
    const type = (req.headers.get("content-type") ?? "").slice(0, 100);
    headers["Content-Type"] = /^audio\/[\w.+-]+(\s*;[\w\s=.+-]*)?$/i.test(type) ? type : "application/octet-stream";
    if (model === "translate") {
      const target = q.get("target") === "ha" ? "ha" : "fr";
      out.set("target", target);
      if (target === "ha") out.set("include_audio", "1");      // French speech is withdrawn: a French translation is text
    }
    if (model === "converse") out.set("persona", persona);     // no session id: the API keeps no conversation
  }

  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(`${apiBase}${PATH[model as Model]}${out.size ? `?${out}` : ""}`,
      { method: "POST", headers, body, signal: AbortSignal.timeout(290_000), cache: "no-store" });
  } catch {
    return fail(504, "upstream_timeout", "The model took too long to answer. Try again: the first request wakes it.");
  }
  // The gateway's answer as it is (its errors already have the API's shape), with how long it took, and when to
  // retry after a rate limit, as the demo route passes it on.
  const reply = new Headers({
    "Content-Type": res.headers.get("content-type") ?? "application/json",
    "Cache-Control": "no-store",
    "X-Namu-Latency-Ms": String(Date.now() - t0),
  });
  const seconds = res.headers.get("x-audio-seconds"), retry = res.headers.get("retry-after");
  if (seconds) reply.set("X-Audio-Seconds", seconds);
  if (retry) reply.set("Retry-After", retry);
  return new Response(res.body, { status: res.status, headers: reply });
}
