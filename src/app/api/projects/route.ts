import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isMissingTable } from "@/lib/db";
import { fail, signedIn } from "@/lib/http";
import { cleanPatch, titleFrom } from "@/lib/project-shape";
import { createProject, listProjects } from "@/lib/projects";

/* Create's projects: GET the user's projects (newest first); POST { title?, sourceLang, sourceText?, kind?, madeFor? }
   makes one, titled from its text when no title is given. */
export const dynamic = "force-dynamic";

const notReady = () => fail(503, "not_ready", "Projects are being set up.");

export async function GET(req: NextRequest) {
  const s = await signedIn(req, false);
  if (s.e) return s.e;
  try { return NextResponse.json({ projects: await listProjects(s.user.id) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { if (isMissingTable(e)) return notReady(); throw e; }
}

export async function POST(req: NextRequest) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const j = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!j) return fail(400, "invalid_json", "Send JSON.");
  const p = cleanPatch(j);
  if (!p.sourceLang) return fail(400, "unknown_language", "Unknown language.");
  const sourceText = p.sourceText ?? "";
  try {
    const project = await createProject(s.user.id, {
      title: p.title ?? (titleFrom(sourceText) || "Untitled"), kind: p.kind ?? "message", sourceLang: p.sourceLang, sourceText, madeFor: p.madeFor ?? "whatsapp",
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (e) {
    if (isMissingTable(e)) return notReady();
    if (e instanceof RangeError) return fail(409, "limit_reached", "This account has as many projects as it can keep.");
    throw e;
  }
}
