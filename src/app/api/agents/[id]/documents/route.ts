import { NextResponse } from "next/server";
import { agentRoute, notFound } from "@/lib/agents-http";
import { addDoc } from "@/lib/agents";
import { LIMITS_AGENT } from "@/lib/agent-shape";
import { fail } from "@/lib/http";

/* POST { name, body }: a document the agent answers from (text: pasted, or read from a .txt or .md in the browser). */
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const POST = agentRoute<Ctx>(true, async (req, user, { params }) => {
  const j = await req.json().catch(() => null) as { name?: unknown; body?: unknown } | null;
  const body = typeof j?.body === "string" ? j.body.trim() : "";
  if (!body) return fail(400, "empty_document", "The document is empty.");
  if (body.length > LIMITS_AGENT.doc) return fail(413, "document_too_long", `Up to ${LIMITS_AGENT.doc} characters.`);
  const doc = await addDoc(user.id, (await params).id, typeof j?.name === "string" ? j.name : "", body);
  return doc ? NextResponse.json({ doc }, { status: 201 }) : notFound();
});
