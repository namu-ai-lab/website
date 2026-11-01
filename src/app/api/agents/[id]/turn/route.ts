import { NextResponse } from "next/server";
import { agentRoute, notFound } from "@/lib/agents-http";
import { appendTurns, bodiesOf, conversationOf, getAgent } from "@/lib/agents";
import { nowTurn, turn } from "@/lib/agent-turn";
import { fail } from "@/lib/http";
import { LIMITS } from "@/lib/limits";

/* One turn of a test conversation: the caller's speech (an audio body) or text (JSON { text }), ?c=<conversation>
   to carry one on. Answers { conversation, heard, reply, audio (base64 WAV) } and keeps the two turns' text. */
export const dynamic = "force-dynamic";
export const maxDuration = 300;
type Ctx = { params: Promise<{ id: string }> };
const MAX = LIMITS.playgroundUploadMb * 1024 * 1024;

export const POST = agentRoute<Ctx>(true, async (req, user, { params }) => {
  const agent = await getAgent(user.id, (await params).id);
  if (!agent) return notFound();
  const c = req.nextUrl.searchParams.get("c");
  const conv = c ? await conversationOf(user.id, c) : null;
  const history = conv && conv.agent_id === agent.id ? conv.turns : [];
  const type = (req.headers.get("content-type") ?? "").slice(0, 100);
  let input: { text: string } | { audio: ArrayBuffer; type: string };
  if (type.startsWith("application/json")) {
    const j = await req.json().catch(() => null) as { text?: unknown } | null;
    const text = typeof j?.text === "string" ? j.text.trim().slice(0, 2000) : "";
    if (!text) return fail(400, "missing_text", "Write a message.");
    input = { text };
  } else {
    if (Number(req.headers.get("content-length") ?? "0") > MAX) return fail(413, "payload_too_large", "Keep the turn short.");
    const audio = await req.arrayBuffer();
    if (!audio.byteLength || audio.byteLength > MAX) return fail(413, "payload_too_large", "Keep the turn short.");
    input = { audio, type: /^audio\/[\w.+-]+(\s*;[\w\s=.+-]*)?$/i.test(type) ? type : "application/octet-stream" };
  }
  const out = await turn(user.id, agent, await bodiesOf(user.id, agent.id), history, input);
  const id = await appendTurns(user.id, agent.id, conv && conv.agent_id === agent.id ? conv.id : null, "test", null,
    [nowTurn("caller", out.heard), nowTurn("agent", out.reply)]);
  return NextResponse.json({ conversation: id, ...out }, { headers: { "Cache-Control": "no-store" } });
});
