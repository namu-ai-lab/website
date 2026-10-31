import { NextResponse } from "next/server";
import { agentRoute, notFound } from "@/lib/agents-http";
import { bodiesOf, getAgent, saveRun, testsOf } from "@/lib/agents";
import { LIMITS_AGENT, passes } from "@/lib/agent-shape";
import { GatewayError } from "@/lib/gateway";
import { reply } from "@/lib/agent-turn";

/* POST: runs the agent's tests (the first LIMITS_AGENT.testsPerRun), one after the other, in text (no speech is made): a test passes when the agent
   answers and its reply holds every expected word. Returns the tests with their results. */
export const dynamic = "force-dynamic";
export const maxDuration = 300;
type Ctx = { params: Promise<{ id: string }> };

export const POST = agentRoute<Ctx>(true, async (_req, user, { params }) => {
  const agent = await getAgent(user.id, (await params).id);
  if (!agent) return notFound();
  const [tests, docs] = await Promise.all([testsOf(user.id, agent.id), bodiesOf(user.id, agent.id)]);
  for (const t of tests.slice(0, LIMITS_AGENT.testsPerRun)) {
    let text = "";
    try { text = await reply(user.id, agent, docs, [], t.ask); }
    catch (e) { if (e instanceof GatewayError && e.status !== 502 && e.status !== 504) throw e; text = ""; }   // paused, used up, too fast: stop the run
    await saveRun(user.id, t.id, Boolean(text) && passes(text, t.expect), text);
  }
  return NextResponse.json({ tests: await testsOf(user.id, agent.id) });
});
