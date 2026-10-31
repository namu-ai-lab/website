import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isLangCode, isVoiceId, voicesFor } from "@/lib/catalog";
import { isMissingTable } from "@/lib/db";
import { fail, signedIn } from "@/lib/http";
import { MAX_TEXT, isStatus, isUuid } from "@/lib/project-shape";
import { saveVersion } from "@/lib/projects";

/* One language of a project: PUT { text?, voice?, status? } writes it (made on first use). A voice must speak the
   language; null clears it. */
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; lang: string }> }) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const { id, lang } = await params;
  if (!isUuid(id)) return fail(404, "not_found", "No such project.");
  if (!isLangCode(lang)) return fail(400, "unknown_language", "Unknown language.");
  const j = await req.json().catch(() => null) as { text?: unknown; voice?: unknown; status?: unknown } | null;
  if (!j) return fail(400, "invalid_json", "Send JSON.");
  if (j.voice !== undefined && j.voice !== null && !(isVoiceId(j.voice) && voicesFor(lang).some(v => v.id === j.voice))) return fail(400, "unknown_voice", "That voice does not speak this language.");
  if (j.status !== undefined && !isStatus(j.status)) return fail(400, "unknown_status", "Unknown status.");
  const patch = {
    text: typeof j.text === "string" ? j.text.slice(0, MAX_TEXT) : undefined,
    voice: j.voice === null ? null : typeof j.voice === "string" ? j.voice : undefined,
    status: isStatus(j.status) ? j.status : undefined,
  };
  try {
    const version = await saveVersion(s.user.id, id, lang, patch);
    return version ? NextResponse.json({ version }) : fail(404, "not_found", "No such project.");
  } catch (e) { if (isMissingTable(e)) return fail(503, "not_ready", "Projects are being set up."); throw e; }
}
