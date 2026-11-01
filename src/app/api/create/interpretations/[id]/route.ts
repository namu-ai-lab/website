import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isMissingTable } from "@/lib/db";
import { fail, signedIn } from "@/lib/http";
import { isUuid } from "@/lib/interpretation-shape";
import { deleteInterpretation, getInterpretation } from "@/lib/interpretations";

/* One Interpreter conversation: GET it with its turns, DELETE it. */
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

const notFound = () => fail(404, "not_found", "No such conversation.");

export async function GET(req: NextRequest, { params }: Ctx) {
  const s = await signedIn(req, false);
  if (s.e) return s.e;
  const id = (await params).id;
  if (!isUuid(id)) return notFound();
  try {
    const c = await getInterpretation(s.user.id, id);
    return c ? NextResponse.json({ conversation: c }, { headers: { "Cache-Control": "no-store" } }) : notFound();
  } catch (e) { if (isMissingTable(e)) return notFound(); throw e; }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const id = (await params).id;
  if (!isUuid(id)) return notFound();
  try { return (await deleteInterpretation(s.user.id, id)) ? new NextResponse(null, { status: 204 }) : notFound(); }
  catch (e) { if (isMissingTable(e)) return notFound(); throw e; }
}
