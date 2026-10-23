import type { NextRequest } from "next/server";
import { setting } from "@/lib/env";
import { apiBase } from "@/lib/public-config";
import { fail, signedIn } from "@/lib/http";

/* The console Playground: a signed-in developer tries a model as themselves, as on platform.openai.com. The browser
   never holds a key. This route checks the session, then calls the gateway with the website's service key
   (NAMU_SERVICE_KEY) and names the developer's account (X-Namu-Account): the gateway applies that account's status,
   allowance and rate limit, and the request appears in their usage and logs as "Playground".
     speech      JSON { text, voice }                    → audio/wav
     transcribe  audio body                              → { text, ... }
     translate   audio body, ?target=fr|ha               → { source_text, text, audio }
     converse    audio body, ?persona=&session_id=       → { heard, reply, audio } */
export const dynamic = "force-dynamic";
export const maxDuration = 300;            // a cold GPU, then up to five minutes of audio

const PATH = { speech: "/v1/speech", transcribe: "/v1/transcribe", translate: "/v1/translate", converse: "/v1/converse" } as const;
type Model = keyof typeof PATH;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_TEXT = 2000;

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
    if (text.length > MAX_TEXT) return fail(413, "text_too_long", `Up to ${MAX_TEXT} characters.`);
    body = JSON.stringify({ text, voice: typeof j?.voice === "string" ? j.voice : "nadia" });
    headers["Content-Type"] = "application/json";
  } else {
    if (Number(req.headers.get("content-length") ?? "0") > MAX_AUDIO_BYTES) return fail(413, "payload_too_large", "Audio must be 25 MB or smaller.");
    const audio = await req.arrayBuffer();
    if (!audio.byteLength) return fail(400, "empty_audio", "The audio was empty.");
    if (audio.byteLength > MAX_AUDIO_BYTES) return fail(413, "payload_too_large", "Audio must be 25 MB or smaller.");
    body = audio;
    headers["Content-Type"] = "application/octet-stream";
    if (model === "translate") { out.set("target", q.get("target") === "ha" ? "ha" : "fr"); out.set("include_audio", "1"); }
    if (model === "converse") {
      out.set("persona", q.get("persona") === "salim" ? "salim" : "nadia");
      const sid = (q.get("session_id") ?? "").replace(/[^\w-]/g, "").slice(0, 64);
      if (sid) out.set("session_id", sid);
    }
  }

  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(`${apiBase}${PATH[model as Model]}${out.size ? `?${out}` : ""}`,
      { method: "POST", headers, body, signal: AbortSignal.timeout(290_000), cache: "no-store" });
  } catch {
    return fail(504, "upstream_timeout", "The model took too long to answer. Try again: the first request wakes it.");
  }
  // The gateway's answer as it is (its errors already have the API's shape), with how long it took.
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
      "X-Namu-Latency-Ms": String(Date.now() - t0),
      ...(res.headers.get("x-audio-seconds") ? { "X-Audio-Seconds": res.headers.get("x-audio-seconds")! } : {}),
    },
  });
}
