import { NextResponse } from "next/server";
import { agentRoute, notFound } from "@/lib/agents-http";
import { appendTurns, getAgent } from "@/lib/agents";
import { greet, nowTurn } from "@/lib/agent-turn";

/* POST: starts a test conversation with the agent's greeting, written in French and said in the agent's language.
   Answers { conversation, text, audio (base64 WAV) or null }. */
export const dynamic = "force-dynamic";
export const maxDuration = 300;
type Ctx = { params: Promise<{ id: string }> };

export const POST = agentRoute<Ctx>(true, async (_req, user, { params }) => {
  const agent = await getAgent(user.id, (await params).id);
  if (!agent) return notFound();
  const g = await greet(user.id, agent);
  const id = await appendTurns(user.id, agent.id, null, "test", null, g.text ? [nowTurn("agent", g.text)] : []);
  return NextResponse.json({ conversation: id, ...g }, { headers: { "Cache-Control": "no-store" } });
});
