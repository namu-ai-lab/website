import { NextResponse } from "next/server";
import { agentRoute, notFound } from "@/lib/agents-http";
import { addTest } from "@/lib/agents";
import { LIMITS_AGENT } from "@/lib/agent-shape";
import { fail } from "@/lib/http";

/* POST { ask, expect: string[] }: a question the agent must keep answering well, and the words its reply must hold. */
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const POST = agentRoute<Ctx>(true, async (req, user, { params }) => {
  const j = await req.json().catch(() => null) as { ask?: unknown; expect?: unknown } | null;
  const ask = typeof j?.ask === "string" ? j.ask.trim() : "";
  if (!ask) return fail(400, "missing_question", "Write the question.");
  const expect = Array.isArray(j?.expect) ? j.expect.filter((w): w is string => typeof w === "string" && !!w.trim()).map(w => w.trim().slice(0, 80)).slice(0, LIMITS_AGENT.expect) : [];
  const test = await addTest(user.id, (await params).id, ask, expect);
  return test ? NextResponse.json({ test }, { status: 201 }) : notFound();
});
