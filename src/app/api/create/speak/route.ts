import type { NextRequest } from "next/server";
import { can, isLangCode, isVoiceId, voicesFor } from "@/lib/catalog";
import { applyWords } from "@/lib/catalog/text";
import { isMissingTable } from "@/lib/db";
import { gateway, gatewayFailure } from "@/lib/gateway";
import { fail, signedIn } from "@/lib/http";
import { wordsOf } from "@/lib/kit";
import { LIMITS } from "@/lib/limits";

/* Create's speech: POST { text, lang, voice } → WAV, as the signed-in user (their allowance, their logs). The
   organisation's word list is applied first, so its terms and names are said its way. The audio streams through
   untouched; the browser turns it into the file each channel needs (lib/audio-out). */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const j = await req.json().catch(() => null) as { text?: unknown; lang?: unknown; voice?: unknown } | null;
  const text = typeof j?.text === "string" ? j.text.trim() : "";
  if (!text) return fail(400, "missing_text", "Write something to say.");
  if (text.length > LIMITS.textChars) return fail(413, "text_too_long", `Up to ${LIMITS.textChars} characters.`);
  if (!isLangCode(j?.lang) || !can("speech", j.lang)) return fail(400, "unsupported_language", "This language cannot be spoken yet.");
  const voice = isVoiceId(j?.voice) && voicesFor(j.lang).some(v => v.id === j.voice) ? j.voice : voicesFor(j.lang)[0]?.id;
  if (!voice) return fail(400, "unknown_voice", "No voice speaks this language yet.");
  const words = await wordsOf(s.user.id).catch(e => { if (isMissingTable(e)) return []; throw e; });
  const said = applyWords(text, words, j.lang);
  const t0 = Date.now();
  try {
    const res = await gateway(s.user.id, "/v1/speech", { body: JSON.stringify({ text: said, voice }), type: "application/json" });
    const headers = new Headers({ "Content-Type": res.headers.get("content-type") ?? "audio/wav", "Cache-Control": "no-store", "X-Namu-Latency-Ms": String(Date.now() - t0) });
    const seconds = res.headers.get("x-audio-seconds");
    if (seconds) headers.set("X-Audio-Seconds", seconds);
    return new Response(res.body, { status: 200, headers });
  } catch (e) {
    const f = gatewayFailure(e);
    return fail(f.status, f.type, f.message);
  }
}
