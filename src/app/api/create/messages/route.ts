import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isVoiceId, voicesFor } from "@/lib/catalog";
import { isMissingTable } from "@/lib/db";
import { fail, signedIn } from "@/lib/http";
import { cleanMessage } from "@/lib/project-shape";
import { listMessages, saveMessage } from "@/lib/projects";

/* Create's messages: GET the user's latest (newest first); POST { sourceLang, sourceText, lang, text, voice, madeFor }
   keeps one that was just made, so it shows in Recent and History. */
export const dynamic = "force-dynamic";

const notReady = () => fail(503, "not_ready", "Messages are being set up.");

export async function GET(req: NextRequest) {
  const s = await signedIn(req, false);
  if (s.e) return s.e;
  try { return NextResponse.json({ messages: await listMessages(s.user.id) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { if (isMissingTable(e)) return notReady(); throw e; }
}

export async function POST(req: NextRequest) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const j = await req.json().catch(() => null) as Record<string, unknown> | null;
  const m = j && cleanMessage(j);
  if (!m) return fail(400, "invalid_message", "Send the words, their language and the language they were written in.");
  if (m.voice !== null && !(isVoiceId(m.voice) && voicesFor(m.lang).some(v => v.id === m.voice))) return fail(400, "unknown_voice", "That voice does not speak this language.");
  try { return NextResponse.json({ message: await saveMessage(s.user.id, m) }, { status: 201 }); }
  catch (e) {
    if (isMissingTable(e)) return notReady();
    if (e instanceof RangeError) return fail(409, "limit_reached", "This account has as many messages as it can keep.");
    throw e;
  }
}
