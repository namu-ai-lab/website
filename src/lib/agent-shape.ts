/* What an agent is, as the builder, the routes and the server share it (browser-safe: no database here). An agent
   has a greeting and instructions written in French (organisations write French; the platform speaks them in the
   caller's language), a voice and languages from the catalog, checks (what a good conversation is, and the fields to
   collect), and the channels it answers on. lib/agents keeps them; lib/agent-turn runs a conversation. */
import { isLangCode, isVoiceId, type LangCode, type VoiceId } from "@/lib/catalog";

export const LIMITS_AGENT = { name: 80, greeting: 600, instructions: 8000, doc: 200_000, docs: 20, tests: 50, testsPerRun: 10, checks: 30, ask: 1000, expect: 8, agents: 50, turns: 200 } as const;

export type Check = { kind: "goal" | "field"; text: string };
export type Channels = { whatsapp?: { phoneNumberId: string } };

export type Agent = {
  id: string; name: string; template: string | null; greeting: string; instructions: string;
  voice: VoiceId | null; languages: LangCode[]; checks: Check[]; channels: Channels;
  created_at: string; updated_at: string;
};
export type AgentDoc = { id: string; agent_id: string; name: string; chars: number; created_at: string };
export type AgentTest = { id: string; agent_id: string; ask: string; expect: string[]; last_pass: boolean | null; last_reply: string | null; last_run_at: string | null };
/** One turn; `ref` is the channel's own id for it (a WhatsApp message id), so a message delivered twice is answered once. */
export type Turn = { role: "caller" | "agent"; text: string; at: string; ref?: string };
export type Conversation = {
  id: string; agent_id: string; agent_name: string; channel: "test" | "whatsapp" | "web"; contact: string | null;
  turns: Turn[]; flagged: boolean; started_at: string; updated_at: string;
};

/** The fields a PATCH may change, each cleaned; anything else is dropped. */
export type AgentPatch = Partial<Pick<Agent, "name" | "greeting" | "instructions" | "voice" | "languages" | "checks" | "channels">>;

/** A PATCH body, cleaned. Channels (which WhatsApp number an agent answers) change only with `channels: true`: Namu
    binds a number to its owner's agent, so nobody can point an agent at someone else's number. */
export function cleanPatch(x: unknown, o: { channels?: boolean } = {}): AgentPatch | null {
  if (!x || typeof x !== "object") return null;
  const j = x as Record<string, unknown>, out: AgentPatch = {};
  if (typeof j.name === "string") { const n = j.name.trim().slice(0, LIMITS_AGENT.name); if (!n) return null; out.name = n; }
  if (typeof j.greeting === "string") out.greeting = j.greeting.slice(0, LIMITS_AGENT.greeting);
  if (typeof j.instructions === "string") out.instructions = j.instructions.slice(0, LIMITS_AGENT.instructions);
  if (j.voice === null || isVoiceId(j.voice)) out.voice = j.voice as VoiceId | null;
  if (Array.isArray(j.languages)) {
    const langs = [...new Set(j.languages.filter(isLangCode))];
    if (!langs.length) return null;
    out.languages = langs;
  }
  if (Array.isArray(j.checks)) {
    out.checks = j.checks
      .filter((c): c is Check => !!c && typeof c === "object" && ((c as Check).kind === "goal" || (c as Check).kind === "field") && typeof (c as Check).text === "string")
      .map(c => ({ kind: c.kind, text: c.text.trim().slice(0, 300) })).filter(c => c.text).slice(0, LIMITS_AGENT.checks);
  }
  if (o.channels && j.channels && typeof j.channels === "object") {
    const w = (j.channels as Channels).whatsapp;
    const id = typeof w?.phoneNumberId === "string" ? w.phoneNumberId.replace(/\D/g, "").slice(0, 24) : "";
    out.channels = id ? { whatsapp: { phoneNumberId: id } } : {};
  }
  return out;
}

/** A test's expected words, as typed in one box: separated by commas, each trimmed, at most LIMITS_AGENT.expect. */
export const parseExpect = (s: string) => s.split(",").map(w => w.trim()).filter(Boolean).slice(0, LIMITS_AGENT.expect);

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
/** Whether a reply holds every expected word (ignoring case and accents). An empty list passes. */
export const passes = (reply: string, expect: readonly string[]) => expect.every(w => fold(reply).includes(fold(w)));
