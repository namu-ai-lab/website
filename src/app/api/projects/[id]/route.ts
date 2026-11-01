import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isMissingTable } from "@/lib/db";
import { fail, signedIn } from "@/lib/http";
import { cleanPatch, isUuid } from "@/lib/project-shape";
import { deleteProject, getProject, updateProject } from "@/lib/projects";

/* One project: GET it with its versions; PATCH { title?, sourceLang?, sourceText?, madeFor?, kind? }; DELETE it. */
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

const missing = () => fail(404, "not_found", "No such project.");
const notReady = () => fail(503, "not_ready", "Projects are being set up.");

export async function GET(req: NextRequest, { params }: Ctx) {
  const s = await signedIn(req, false);
  if (s.e) return s.e;
  const { id } = await params;
  if (!isUuid(id)) return missing();
  try { const project = await getProject(s.user.id, id); return project ? NextResponse.json({ project }) : missing(); }
  catch (e) { if (isMissingTable(e)) return notReady(); throw e; }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const { id } = await params;
  if (!isUuid(id)) return missing();
  const j = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!j) return fail(400, "invalid_json", "Send JSON.");
  try { const project = await updateProject(s.user.id, id, cleanPatch(j)); return project ? NextResponse.json({ project }) : missing(); }
  catch (e) { if (isMissingTable(e)) return notReady(); throw e; }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const { id } = await params;
  if (!isUuid(id)) return missing();
  try { return (await deleteProject(s.user.id, id)) ? new Response(null, { status: 204 }) : missing(); }
  catch (e) { if (isMissingTable(e)) return notReady(); throw e; }
}
