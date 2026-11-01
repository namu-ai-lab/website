import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { can, canTranslate, isLangCode } from "@/lib/catalog";
import { gatewayFailure, transcribe, translateSpeech } from "@/lib/gateway";
import { fail, signedIn } from "@/lib/http";
import { LIMITS } from "@/lib/limits";

/* Create's listening: a recording in, what was said out, and, with ?to=fr, its translation beside it.
   POST audio body ?lang=ha&to=fr → { text, translation? }. Bodies up to LIMITS.playgroundUploadMb (Vercel's
   limit on a function's request). */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX = LIMITS.playgroundUploadMb * 1024 * 1024;

export async function POST(req: NextRequest) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const q = req.nextUrl.searchParams, lang = q.get("lang"), to = q.get("to");
  if (!isLangCode(lang) || !can("transcribe", lang)) return fail(400, "unsupported_language", "This language cannot be transcribed yet.");
  if (Number(req.headers.get("content-length") ?? "0") > MAX) return fail(413, "payload_too_large", `Up to ${LIMITS.playgroundUploadMb} MB.`);
  const audio = await req.arrayBuffer();
  if (!audio.byteLength) return fail(400, "empty_audio", "The audio was empty.");
  if (audio.byteLength > MAX) return fail(413, "payload_too_large", `Up to ${LIMITS.playgroundUploadMb} MB.`);
  const raw = (req.headers.get("content-type") ?? "").slice(0, 100);
  const type = /^audio\/[\w.+-]+(\s*;[\w\s=.+-]*)?$/i.test(raw) ? raw : "application/octet-stream";
  try {
    const text = await transcribe(s.user.id, audio, type);
    let translation: string | undefined;
    if (to && isLangCode(to) && to !== lang && canTranslate(lang, to)) translation = (await translateSpeech(s.user.id, audio, type, lang, to)).text;
    return NextResponse.json({ text, translation }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const f = gatewayFailure(e);
    return fail(f.status, f.type, f.message);
  }
}
