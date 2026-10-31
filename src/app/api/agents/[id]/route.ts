import { NextResponse } from "next/server";
import { agentRoute, notFound } from "@/lib/agents-http";
import { deleteAgent, getAgent, updateAgent } from "@/lib/agents";
import { cleanPatch } from "@/lib/agent-shape";
import { fail } from "@/lib/http";
import { profileOf } from "@/lib/account";

/* One agent: GET it, PATCH its fields (name, greeting, instructions, voice, languages, checks; channels only for a
   Namu admin, who binds a WhatsApp number to the organisation that owns it), DELETE it with its documents, tests and
   conversations. */
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = agentRoute<Ctx>(false, async (_req, user, { params }) => {
  const a = await getAgent(user.id, (await params).id);
  return a ? NextResponse.json({ agent: a }, { headers: { "Cache-Control": "no-store" } }) : notFound();
});

export const PATCH = agentRoute<Ctx>(true, async (req, user, { params }) => {
  const admin = (await profileOf(user.id)).role === "admin";
  const patch = cleanPatch(await req.json().catch(() => null), { channels: admin });
  if (!patch) return fail(400, "invalid_agent", "A name and at least one language are needed.");
  const a = await updateAgent(user.id, (await params).id, patch);
  return a ? NextResponse.json({ agent: a }) : notFound();
});

export const DELETE = agentRoute<Ctx>(true, async (_req, user, { params }) =>
  (await deleteAgent(user.id, (await params).id)) ? new NextResponse(null, { status: 204 }) : notFound());
