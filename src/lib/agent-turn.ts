import "server-only";
import { defaultVoice, language, voice as voiceOf, voicesFor, type LangCode, type VoiceId } from "@/lib/catalog";
import { applyWords } from "@/lib/catalog/text";
import { contextMessage, type Doc } from "@/lib/agent-knowledge";
import type { Agent, Turn } from "@/lib/agent-shape";
import { isMissingTable } from "@/lib/db";
import { setting } from "@/lib/env";
import { GatewayError, gateway, speak, transcribe, translateText } from "@/lib/gateway";
import { voicesOf, wordsOf } from "@/lib/kit";

/* One turn of a conversation with an agent, the way the home page's Aïr runs (src/app/api/demo/converse): a chain, not
   one speech-to-speech model. What the caller said is written down (Tatsuniya), the agent's text step answers
   (Aïr's agent service: its own system prompt, then this agent's brief and the matching passages of its documents as
   a first message, then the conversation), and the answer is said in the agent's voice (Tafiya), the organisation's
   word list applied. Every model run counts against the agent owner's allowance. */

const AGENT_URL = () => (setting("NAMU_AGENT_URL") ?? "https://namu-ai-lab--namu-agent-api.modal.run").replace(/\/+$/, "");
const MAX_HISTORY = 30;   // the service takes 40 messages; the brief takes one

/** Modal proxy auth, when the model services are locked (both set in Vercel), as the home page's conversation sends it. */
const agentHeaders = (): Record<string, string> => {
  const k = setting("MODAL_PROXY_KEY"), s = setting("MODAL_PROXY_SECRET");
  return k && s ? { "Modal-Key": k, "Modal-Secret": s } : {};
};

/** The language the agent answers in: its first. */
export const speaking = (a: Agent): LangCode => a.languages[0] ?? "ha";

/** The agent's voice for its language: its own, else the organisation's choice, else the catalog's first. */
export function voiceFor(a: Agent, kit: Partial<Record<string, string>> = {}): VoiceId | null {
  const lang = speaking(a);
  if (a.voice && voicesFor(lang).some(v => v.id === a.voice)) return a.voice;
  return defaultVoice(lang, kit);
}

/** The agent's text step: its reply to `message`, after `history`. */
export async function reply(a: Agent, docs: readonly Doc[], history: readonly Turn[], message: string): Promise<string> {
  const context = contextMessage({ name: a.name, instructions: a.instructions, docs, query: [message, ...history.slice(-2).map(t => t.text)].join(" "),
    languages: a.languages.map(l => language(l).endonym) });
  const messages = [
    { role: "user", content: context },
    ...history.slice(-MAX_HISTORY).map(t => ({ role: t.role === "agent" ? "assistant" : "user", content: t.text.slice(0, 4000) })),
    { role: "user", content: message.slice(0, 4000) },
  ];
  const v = voiceFor(a);
  const persona = v ? voiceOf(v).persona : undefined;
  let res: Response;
  try {
    res = await fetch(`${AGENT_URL()}/v1/chat`, {
      method: "POST", headers: { ...agentHeaders(), "Content-Type": "application/json" }, cache: "no-store",
      body: JSON.stringify({ messages, persona }), signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new GatewayError(504, "agent_timeout", "The agent took too long to answer. Try again.");
  }
  if (!res.ok) throw new GatewayError(502, "agent_error", "The agent could not answer.");
  const text = String(((await res.json()) as { reply?: string }).reply ?? "").trim();
  if (!text) throw new GatewayError(502, "agent_error", "The agent could not answer.");
  return text;
}

/** The kit the agent's owner keeps (word list, voices), empty while its tables are being set up. */
async function kitOf(userId: string) {
  const none = (e: unknown) => { if (isMissingTable(e)) return null; throw e; };
  const [words, voices] = await Promise.all([wordsOf(userId).catch(none), voicesOf(userId).catch(none)]);
  return { words: words ?? [], voices: voices ?? {} };
}

/** The reply said in the agent's voice: WAV, or Ogg Opus when `opus` and the gateway can make it (the response says). */
export async function say(userId: string, a: Agent, text: string, o: { opus?: boolean } = {}): Promise<{ audio: ArrayBuffer; type: string } | null> {
  const kit = await kitOf(userId);
  const v = voiceFor(a, kit.voices);
  if (!v) return null;
  const said = applyWords(text, kit.words, speaking(a));
  if (!o.opus) return { audio: await speak(userId, said, v), type: "audio/wav" };
  const res = await gateway(userId, "/v1/speech", { body: JSON.stringify({ text: said, voice: v, format: "opus" }), type: "application/json" });
  return { audio: await res.arrayBuffer(), type: (res.headers.get("content-type") ?? "audio/wav").split(";")[0] };
}

export type TurnInput = { audio: ArrayBuffer; type: string } | { text: string };
export type TurnResult = { heard: string; reply: string; audio: string | null };

/** One full turn: heard → reply → spoken (base64 WAV). An empty hearing is a 422. */
export async function turn(userId: string, a: Agent, docs: readonly Doc[], history: readonly Turn[], input: TurnInput): Promise<TurnResult> {
  const heard = ("text" in input ? input.text : await transcribe(userId, input.audio, input.type)).trim();
  if (!heard) throw new GatewayError(422, "nothing_heard", "Nothing was heard. Try again, a little closer.");
  const text = await reply(a, docs, history, heard);
  const spoken = await say(userId, a, text);
  return { heard, reply: text, audio: spoken ? Buffer.from(spoken.audio).toString("base64") : null };
}

/** The greeting, written in French by the organisation, said in the agent's language. */
export async function greet(userId: string, a: Agent): Promise<{ text: string; audio: string | null }> {
  const lang = speaking(a), fr = a.greeting.trim();
  if (!fr) return { text: "", audio: null };
  const frVoice = voicesFor("fr")[0]?.id;
  const text = lang === "fr" || !frVoice ? fr : (await translateText(userId, fr, "fr", lang, frVoice)).text;
  const spoken = await say(userId, a, text);
  return { text, audio: spoken ? Buffer.from(spoken.audio).toString("base64") : null };
}

export const nowTurn = (role: Turn["role"], text: string): Turn => ({ role, text, at: new Date().toISOString() });
