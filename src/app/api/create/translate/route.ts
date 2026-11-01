import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { canTranslate, canTranslateText, isLangCode, voicesFor } from "@/lib/catalog";
import { gatewayFailure, translateText } from "@/lib/gateway";
import { fail, signedIn } from "@/lib/http";
import { LIMITS } from "@/lib/limits";

/* Create's text translation: POST { text, from, to } → { text }, as the signed-in user. French in, the local
   languages out, as far as the catalog's translation pairs go. */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const j = await req.json().catch(() => null) as { text?: unknown; from?: unknown; to?: unknown } | null;
  const text = typeof j?.text === "string" ? j.text.trim() : "";
  if (!text) return fail(400, "missing_text", "Write something to translate.");
  if (text.length > LIMITS.textChars) return fail(413, "text_too_long", `Up to ${LIMITS.textChars} characters.`);
  if (!isLangCode(j?.from) || !isLangCode(j?.to) || !canTranslate(j.from, j.to)) return fail(400, "unsupported_pair", "This translation is not available yet.");
  if (j.from === j.to) return NextResponse.json({ text });
  if (!canTranslateText(j.from, j.to)) return fail(400, "speak_it", "Written text in this language cannot be translated yet. Say it instead.");
  const voice = voicesFor(j.from)[0]?.id ?? null;
  try {
    const out = await translateText(s.user.id, text, j.from, j.to, voice);
    return NextResponse.json({ text: out.text }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const f = gatewayFailure(e);
    return fail(f.status, f.type, f.message);
  }
}
