import "server-only";
import { sql, tx } from "@/lib/db";
import { isLangCode, isVoiceId } from "@/lib/catalog";
import type { Doc } from "@/lib/agent-knowledge";
import { LIMITS_AGENT, type Agent, type AgentDoc, type AgentPatch, type AgentTest, type Channels, type Check, type Conversation, type Turn } from "@/lib/agent-shape";

/* Namu Agents' data: agents, the documents they answer from, their tests and their conversations (migration 0006).
   Every query a signed-in page or route makes filters on the user's id; only the WhatsApp webhook looks an agent up
   by its phone number, because Meta's call carries no user. No audio is stored. */

export const isUuid = (x: unknown): x is string => typeof x === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);

type AgentRecord = {
  id: string; name: string; template: string | null; greeting: string; instructions: string; voice: string | null; languages: string[];
  checks: Check[]; channels: Channels; created_at: Date; updated_at: Date;
};
const agentColumns = (a = "") => ["id::text as id", "name", "template", "greeting", "instructions", "voice", "languages", "checks", "channels", "created_at", "updated_at"]
  .map(c => a + c).join(", ");
const AGENT_COLUMNS = agentColumns();
const agentOf = (r: AgentRecord): Agent => ({
  id: r.id, name: r.name, template: r.template, greeting: r.greeting, instructions: r.instructions,
  voice: isVoiceId(r.voice) ? r.voice : null, languages: r.languages.filter(isLangCode),
  checks: Array.isArray(r.checks) ? r.checks : [], channels: r.channels && typeof r.channels === "object" ? r.channels : {},
  created_at: r.created_at.toISOString(), updated_at: r.updated_at.toISOString(),
});

export type AgentSummary = Agent & { docs: number; conversations: number };

export async function listAgents(userId: string): Promise<AgentSummary[]> {
  const rows = await sql<AgentRecord & { docs: number; conversations: number }>(`select ${agentColumns("a.")},
      (select count(*)::int from public.agent_documents d where d.agent_id = a.id) as docs,
      (select count(*)::int from public.agent_conversations c where c.agent_id = a.id) as conversations
    from public.agents a where a.user_id = $1 order by a.updated_at desc limit 200`, [userId]);
  return rows.map(r => ({ ...agentOf(r), docs: r.docs, conversations: r.conversations }));
}

export async function getAgent(userId: string, id: string): Promise<Agent | null> {
  if (!isUuid(id)) return null;
  const [r] = await sql<AgentRecord>(`select ${AGENT_COLUMNS} from public.agents where id = $1 and user_id = $2`, [id, userId]);
  return r ? agentOf(r) : null;
}

export type AgentInit = Omit<Agent, "id" | "created_at" | "updated_at" | "channels"> & { tests?: { ask: string; expect: string[] }[] };

export async function createAgent(userId: string, a: AgentInit): Promise<Agent> {
  return tx(async q => {
    const [r] = await q<AgentRecord>(`insert into public.agents (user_id, name, template, greeting, instructions, voice, languages, checks)
      values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb) returning ${AGENT_COLUMNS}`,
      [userId, a.name.slice(0, LIMITS_AGENT.name), a.template, a.greeting.slice(0, LIMITS_AGENT.greeting), a.instructions.slice(0, LIMITS_AGENT.instructions),
        a.voice, a.languages, JSON.stringify(a.checks)]);
    for (const t of a.tests ?? []) {
      await q("insert into public.agent_tests (agent_id, user_id, ask, expect) values ($1, $2, $3, $4)", [r.id, userId, t.ask.slice(0, LIMITS_AGENT.ask), t.expect]);
    }
    return agentOf(r);
  });
}

export async function updateAgent(userId: string, id: string, p: AgentPatch): Promise<Agent | null> {
  if (!isUuid(id)) return null;
  const sets: string[] = [], vals: unknown[] = [id, userId];
  const put = (col: string, v: unknown, cast = "") => { vals.push(v); sets.push(`${col} = $${vals.length}${cast}`); };
  if (p.name !== undefined) put("name", p.name);
  if (p.greeting !== undefined) put("greeting", p.greeting);
  if (p.instructions !== undefined) put("instructions", p.instructions);
  if (p.voice !== undefined) put("voice", p.voice);
  if (p.languages !== undefined) put("languages", p.languages);
  if (p.checks !== undefined) put("checks", JSON.stringify(p.checks), "::jsonb");
  if (p.channels !== undefined) put("channels", JSON.stringify(p.channels), "::jsonb");
  if (!sets.length) return getAgent(userId, id);
  const [r] = await sql<AgentRecord>(`update public.agents set ${sets.join(", ")}, updated_at = now() where id = $1 and user_id = $2 returning ${AGENT_COLUMNS}`, vals);
  return r ? agentOf(r) : null;
}

export async function deleteAgent(userId: string, id: string): Promise<boolean> {
  if (!isUuid(id)) return false;
  return (await sql<{ id: string }>("delete from public.agents where id = $1 and user_id = $2 returning id::text", [id, userId])).length > 0;
}

/* ---- knowledge */
export type DocRow = AgentDoc & { agent_name: string };

export async function docsOf(userId: string, agentId?: string): Promise<DocRow[]> {
  if (agentId !== undefined && !isUuid(agentId)) return [];
  const rows = await sql<{ id: string; agent_id: string; agent_name: string; name: string; chars: number; created_at: Date }>(
    `select d.id::text, d.agent_id::text, a.name as agent_name, d.name, char_length(d.body)::int as chars, d.created_at
     from public.agent_documents d join public.agents a on a.id = d.agent_id
     where d.user_id = $1 ${agentId ? "and d.agent_id = $2" : ""} order by d.created_at desc limit 500`, agentId ? [userId, agentId] : [userId]);
  return rows.map(r => ({ ...r, created_at: r.created_at.toISOString() }));
}

export async function bodiesOf(userId: string, agentId: string): Promise<Doc[]> {
  return sql<Doc>("select name, body from public.agent_documents where user_id = $1 and agent_id = $2 order by created_at", [userId, agentId]);
}

export async function addDoc(userId: string, agentId: string, name: string, body: string): Promise<DocRow | null> {
  if (!(await getAgent(userId, agentId))) return null;
  const [{ n }] = await sql<{ n: number }>("select count(*)::int as n from public.agent_documents where agent_id = $1", [agentId]);
  if (n >= LIMITS_AGENT.docs) throw new RangeError("too_many_documents");
  await sql("insert into public.agent_documents (agent_id, user_id, name, body) values ($1, $2, $3, $4)",
    [agentId, userId, name.trim().slice(0, 200) || "Document", body.slice(0, LIMITS_AGENT.doc)]);
  await sql("update public.agents set updated_at = now() where id = $1", [agentId]);
  return (await docsOf(userId, agentId))[0] ?? null;
}

export async function deleteDoc(userId: string, docId: string): Promise<boolean> {
  if (!isUuid(docId)) return false;
  return (await sql<{ id: string }>("delete from public.agent_documents where id = $1 and user_id = $2 returning id::text", [docId, userId])).length > 0;
}

/* ---- tests */
type TestRecord = Omit<AgentTest, "last_run_at"> & { last_run_at: Date | null };
const testOf = (r: TestRecord): AgentTest => ({ ...r, last_run_at: r.last_run_at?.toISOString() ?? null });
const TEST_COLUMNS = "id::text, agent_id::text, ask, expect, last_pass, last_reply, last_run_at";

export async function testsOf(userId: string, agentId: string): Promise<AgentTest[]> {
  if (!isUuid(agentId)) return [];
  return (await sql<TestRecord>(`select ${TEST_COLUMNS} from public.agent_tests where user_id = $1 and agent_id = $2 order by created_at`, [userId, agentId])).map(testOf);
}

export async function addTest(userId: string, agentId: string, ask: string, expect: string[]): Promise<AgentTest | null> {
  if (!(await getAgent(userId, agentId))) return null;
  const [{ n }] = await sql<{ n: number }>("select count(*)::int as n from public.agent_tests where agent_id = $1", [agentId]);
  if (n >= LIMITS_AGENT.tests) throw new RangeError("too_many_tests");
  const [r] = await sql<TestRecord>(`insert into public.agent_tests (agent_id, user_id, ask, expect) values ($1, $2, $3, $4) returning ${TEST_COLUMNS}`,
    [agentId, userId, ask.trim().slice(0, LIMITS_AGENT.ask), expect]);
  return testOf(r);
}

export async function deleteTest(userId: string, testId: string): Promise<boolean> {
  if (!isUuid(testId)) return false;
  return (await sql<{ id: string }>("delete from public.agent_tests where id = $1 and user_id = $2 returning id::text", [testId, userId])).length > 0;
}

export async function saveRun(userId: string, testId: string, pass: boolean, reply: string): Promise<void> {
  await sql("update public.agent_tests set last_pass = $3, last_reply = $4, last_run_at = now() where id = $1 and user_id = $2",
    [testId, userId, pass, reply.slice(0, 4000)]);
}

/* ---- conversations */
type ConvRecord = Omit<Conversation, "started_at" | "updated_at"> & { started_at: Date; updated_at: Date };
const convOf = (r: ConvRecord): Conversation => ({ ...r, turns: Array.isArray(r.turns) ? r.turns : [], started_at: r.started_at.toISOString(), updated_at: r.updated_at.toISOString() });
const CONV_COLUMNS = "c.id::text, c.agent_id::text, a.name as agent_name, c.channel, c.contact, c.turns, c.flagged, c.started_at, c.updated_at";

export async function conversationsOf(userId: string, o: { agentId?: string; limit?: number } = {}): Promise<Conversation[]> {
  if (o.agentId !== undefined && !isUuid(o.agentId)) return [];
  const rows = await sql<ConvRecord>(`select ${CONV_COLUMNS} from public.agent_conversations c join public.agents a on a.id = c.agent_id
    where c.user_id = $1 ${o.agentId ? "and c.agent_id = $2" : ""} order by c.updated_at desc limit ${Math.min(200, o.limit ?? 100)}`,
    o.agentId ? [userId, o.agentId] : [userId]);
  return rows.map(convOf);
}

export async function conversationOf(userId: string, id: string): Promise<Conversation | null> {
  if (!isUuid(id)) return null;
  const [r] = await sql<ConvRecord>(`select ${CONV_COLUMNS} from public.agent_conversations c join public.agents a on a.id = c.agent_id
    where c.id = $1 and c.user_id = $2`, [id, userId]);
  return r ? convOf(r) : null;
}

/** Adds turns to a conversation (a new one when `id` is null or not this agent's), and returns its id. */
export async function appendTurns(userId: string, agentId: string, id: string | null, channel: Conversation["channel"], contact: string | null, turns: Turn[]): Promise<string> {
  if (id && isUuid(id)) {
    const [r] = await sql<{ id: string }>(`update public.agent_conversations set turns = (turns || $4::jsonb), updated_at = now()
      where id = $1 and user_id = $2 and agent_id = $3 returning id::text`, [id, userId, agentId, JSON.stringify(turns)]);
    if (r) return r.id;
  }
  const [r] = await sql<{ id: string }>(`insert into public.agent_conversations (agent_id, user_id, channel, contact, turns)
    values ($1, $2, $3, $4, $5::jsonb) returning id::text`, [agentId, userId, channel, contact, JSON.stringify(turns)]);
  return r.id;
}

export async function setFlag(userId: string, id: string, flagged: boolean): Promise<boolean> {
  if (!isUuid(id)) return false;
  return (await sql<{ id: string }>("update public.agent_conversations set flagged = $3 where id = $1 and user_id = $2 returning id::text", [id, userId, flagged])).length > 0;
}

/* ---- the WhatsApp webhook: no user on Meta's call, so the phone number finds the agent */
export async function agentForWhatsapp(phoneNumberId: string): Promise<{ agent: Agent; userId: string } | null> {
  const [r] = await sql<AgentRecord & { user_id: string }>(`select ${AGENT_COLUMNS}, user_id from public.agents
    where channels -> 'whatsapp' ->> 'phoneNumberId' = $1 order by updated_at desc limit 1`, [phoneNumberId]);
  return r ? { agent: agentOf(r), userId: r.user_id } : null;
}

/** The contact's conversation from the last day, to carry on, or null for a new one. */
export async function recentWhatsapp(userId: string, agentId: string, contact: string): Promise<Conversation | null> {
  const [r] = await sql<ConvRecord>(`select ${CONV_COLUMNS} from public.agent_conversations c join public.agents a on a.id = c.agent_id
    where c.user_id = $1 and c.agent_id = $2 and c.channel = 'whatsapp' and c.contact = $3 and c.updated_at > now() - interval '24 hours'
    order by c.updated_at desc limit 1`, [userId, agentId, contact]);
  return r ? convOf(r) : null;
}
