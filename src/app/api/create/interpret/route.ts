import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { canTranslate, isLangCode } from "@/lib/catalog";
import { gatewayFailure, translateSpeech } from "@/lib/gateway";
import { fail, signedIn } from "@/lib/http";
import { LIMITS } from "@/lib/limits";

/* A recording heard in one language and put into another, as the signed-in user: what was said, and its
   translation. Create's video translation sends one segment at a time; the home page dictates French through it.
   POST audio body ?from=fr&to=ha → { sourceText, text }. Up to LIMITS.playgroundUploadMb. */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX = LIMITS.playgroundUploadMb * 1024 * 1024;

export async function POST(req: NextRequest) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const q = req.nextUrl.searchParams, from = q.get("from"), to = q.get("to");
  if (!isLangCode(from) || !isLangCode(to) || from === to || !canTranslate(from, to)) return fail(400, "unsupported_pair", "This translation is not available yet.");
  if (Number(req.headers.get("content-length") ?? "0") > MAX) return fail(413, "payload_too_large", `Up to ${LIMITS.playgroundUploadMb} MB.`);
  const audio = await req.arrayBuffer();
  if (!audio.byteLength) return fail(400, "empty_audio", "The audio was empty.");
  if (audio.byteLength > MAX) return fail(413, "payload_too_large", `Up to ${LIMITS.playgroundUploadMb} MB.`);
  const raw = (req.headers.get("content-type") ?? "").slice(0, 100);
  const type = /^audio\/[\w.+-]+(\s*;[\w\s=.+-]*)?$/i.test(raw) ? raw : "application/octet-stream";
  try {
    const out = await translateSpeech(s.user.id, audio, type, from, to);
    return NextResponse.json({ sourceText: out.sourceText, text: out.text }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const f = gatewayFailure(e);
    return fail(f.status, f.type, f.message);
  }
}
