import { NextResponse, type NextRequest } from "next/server";
import { apiBase } from "@/lib/public-config";
import { clientIp, fail, sameOrigin } from "@/lib/http";

/* The home page console's live demos. The browser never sees an API key: this route adds the server-held
   demo key and the visitor's IP, and the gateway applies the demo limits (15 s of audio, 300 characters,
   30 requests per IP per hour) on top of the demo key's own quota. Converse stays a preview. */
export const dynamic = "force-dynamic";
export const maxDuration = 120;            // a cold GPU can take a minute to wake

const MODELS = { speech: "/v1/speech", transcribe: "/v1/transcribe", translate: "/v1/translate" } as const;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;  // 15 s of browser audio is far below this
const MAX_TEXT = 300;

export async function POST(req: NextRequest, { params }: { params: Promise<{ model: string }> }) {
  const { model } = await params;
  if (!Object.hasOwn(MODELS, model)) return fail(404, "unknown_model", "Unknown demo.");
  if (!sameOrigin(req)) return fail(403, "bad_origin", "The demo runs from the Namu site only.");
  const key = process.env.NAMU_DEMO_KEY;
  if (!key) return fail(503, "demo_unavailable", "The live demo is not configured.");

  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, "X-Namu-Client-IP": clientIp(req) };
  let body: BodyInit;
  let url = `${apiBase}${MODELS[model as keyof typeof MODELS]}`;

  if (model === "speech") {
    const j = await req.json().catch(() => null) as { text?: unknown; voice?: unknown } | null;
    const text = typeof j?.text === "string" ? j.text.trim() : "";
    if (!text || text.length > MAX_TEXT) return fail(413, "text_too_long", `Up to ${MAX_TEXT} characters in the demo.`);
    const voice = j?.voice === "salim" ? "salim" : "nadia";
    body = JSON.stringify({ text, voice });
    headers["Content-Type"] = "application/json";
  } else {
    const len = Number(req.headers.get("content-length") ?? "0");
    if (len > MAX_AUDIO_BYTES) return fail(413, "payload_too_large", "Keep the clip short.");
    const audio = await req.arrayBuffer();
    if (!audio.byteLength || audio.byteLength > MAX_AUDIO_BYTES) return fail(413, "payload_too_large", "Keep the clip short.");
    body = audio;
    headers["Content-Type"] = "application/octet-stream";
    if (model === "translate") {
      const target = req.nextUrl.searchParams.get("target") === "ha" ? "ha" : "fr";
      url += `?target=${target}&include_audio=1`;
    }
  }

  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(110_000), cache: "no-store" });
  } catch {
    return fail(504, "upstream_timeout", "The model took too long to answer.");
  }
  const type = res.headers.get("content-type") ?? "application/octet-stream";
  const out = new NextResponse(res.body, { status: res.status, headers: { "Content-Type": type, "Cache-Control": "no-store" } });
  const retry = res.headers.get("retry-after"), seconds = res.headers.get("x-audio-seconds");
  if (retry) out.headers.set("Retry-After", retry);
  if (seconds) out.headers.set("X-Audio-Seconds", seconds);     // the length of the speech, for the API tab
  return out;
}
