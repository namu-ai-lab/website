import { NextResponse } from "next/server";
import { agentRoute, notFound } from "@/lib/agents-http";
import { bodiesOf, getAgent, saveRun, testsOf } from "@/lib/agents";
import { passes } from "@/lib/agent-shape";
import { reply } from "@/lib/agent-turn";

/* POST: runs every test of the agent, one after the other, in text (no speech is made): a test passes when the agent
   answers and its reply holds every expected word. Returns the tests with their results. */
export const dynamic = "force-dynamic";
export const maxDuration = 300;
type Ctx = { params: Promise<{ id: string }> };

export const POST = agentRoute<Ctx>(true, async (_req, user, { params }) => {
  const agent = await getAgent(user.id, (await params).id);
  if (!agent) return notFound();
  const [tests, docs] = await Promise.all([testsOf(user.id, agent.id), bodiesOf(user.id, agent.id)]);
  for (const t of tests) {
    let text = "";
    try { text = await reply(agent, docs, [], t.ask); } catch { text = ""; }
    await saveRun(user.id, t.id, Boolean(text) && passes(text, t.expect), text);
  }
  return NextResponse.json({ tests: await testsOf(user.id, agent.id) });
});
