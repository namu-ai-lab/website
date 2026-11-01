import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isLangCode, isVoiceId, voicesFor } from "@/lib/catalog";
import { isMissingTable } from "@/lib/db";
import { fail, signedIn } from "@/lib/http";
import { saveWords, setVoice, voicesOf, wordsOf } from "@/lib/kit";

/* The organisation's kit (Create > Kit): GET its word list and voices; PUT { words } replaces the list;
   PATCH { lang, voice } sets (or, with voice null, clears) the voice for a language. */
export const dynamic = "force-dynamic";

const notReady = () => fail(503, "not_ready", "The kit is being set up.");

export async function GET(req: NextRequest) {
  const s = await signedIn(req, false);
  if (s.e) return s.e;
  try {
    const [words, voices] = await Promise.all([wordsOf(s.user.id), voicesOf(s.user.id)]);
    return NextResponse.json({ words, voices }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { if (isMissingTable(e)) return notReady(); throw e; }
}

export async function PUT(req: NextRequest) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const j = await req.json().catch(() => null) as { words?: unknown } | null;
  if (!Array.isArray(j?.words)) return fail(400, "invalid_json", "Send { words: [...] }.");
  const words = j.words.filter((w): w is { term: string; say: string; lang?: unknown } =>
    !!w && typeof w === "object" && typeof (w as { term?: unknown }).term === "string" && typeof (w as { say?: unknown }).say === "string")
    .map(w => ({ term: w.term, say: w.say, lang: isLangCode(w.lang) ? w.lang : null }));
  try { return NextResponse.json({ words: await saveWords(s.user.id, words) }); }
  catch (e) { if (isMissingTable(e)) return notReady(); throw e; }
}

export async function PATCH(req: NextRequest) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const j = await req.json().catch(() => null) as { lang?: unknown; voice?: unknown } | null;
  if (!isLangCode(j?.lang)) return fail(400, "unknown_language", "Unknown language.");
  const voice = j.voice === null ? null : isVoiceId(j?.voice) && voicesFor(j.lang).some(v => v.id === j.voice) ? j.voice : undefined;
  if (voice === undefined) return fail(400, "unknown_voice", "That voice does not speak this language.");
  try { await setVoice(s.user.id, j.lang, voice); return NextResponse.json({ voices: await voicesOf(s.user.id) }); }
  catch (e) { if (isMissingTable(e)) return notReady(); throw e; }
}
