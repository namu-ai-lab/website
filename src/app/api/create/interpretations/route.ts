import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isMissingTable } from "@/lib/db";
import { fail, signedIn } from "@/lib/http";
import { cleanTurn, isUuid } from "@/lib/interpretation-shape";
import { addTurn, listInterpretations } from "@/lib/interpretations";

/* Create's Interpreter conversations: GET the user's, last used first; POST { id?, turn } keeps a turn that was just
   interpreted, in conversation `id` or in a new one, and answers { id, turn }. */
export const dynamic = "force-dynamic";

const notReady = () => fail(503, "not_ready", "Conversations are being set up.");

export async function GET(req: NextRequest) {
  const s = await signedIn(req, false);
  if (s.e) return s.e;
  try { return NextResponse.json({ conversations: await listInterpretations(s.user.id) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { if (isMissingTable(e)) return notReady(); throw e; }
}

export async function POST(req: NextRequest) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const j = await req.json().catch(() => null) as { id?: unknown; turn?: unknown } | null;
  const id = j?.id ?? null;
  const turn = j?.turn && typeof j.turn === "object" ? cleanTurn(j.turn as Record<string, unknown>) : null;
  if (!turn || (id !== null && !isUuid(id))) return fail(400, "invalid_turn", "Send what was heard, its translation and the two languages.");
  try {
    const kept = await addTurn(s.user.id, id, turn);
    return kept ? NextResponse.json(kept, { status: 201 }) : fail(404, "not_found", "No such conversation.");
  } catch (e) {
    if (isMissingTable(e)) return notReady();
    if (e instanceof RangeError) return fail(409, "limit_reached", e.message === "too_many_turns" ? "This conversation is full. Start a new one." : "This account has as many conversations as it can keep. Delete some first.");
    throw e;
  }
}
