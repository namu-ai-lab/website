import { timingSafeEqual } from "node:crypto";
import { after, type NextRequest } from "next/server";
import { agentForWhatsapp, appendTurns, bodiesOf, recentWhatsapp } from "@/lib/agents";
import { nowTurn, reply, say } from "@/lib/agent-turn";
import { setting } from "@/lib/env";
import { transcribe } from "@/lib/gateway";
import { fail } from "@/lib/http";
import { downloadMedia, hasWhatsapp, markRead, parseWebhook, sendText, sendVoice, verifySignature, type Incoming } from "@/lib/whatsapp";

/* Namu Agents on WhatsApp: the callback URL registered in the Meta app (https://<site>/api/agents/whatsapp).
   GET   Meta's one-time check: hub.verify_token must equal WHATSAPP_VERIFY_TOKEN; the challenge is sent back.
   POST  messages, signed by Meta (X-Hub-Signature-256 over the raw body, with WHATSAPP_APP_SECRET). The call is
         answered at once and each voice note or text is handled after it (Meta retries slow answers): the agent
         whose phone number id received it hears it, answers, and replies with a voice note when the gateway can
         make Ogg Opus, else with text. The conversation's text is kept (channel whatsapp); its audio is not.
   Model runs count against the agent owner's allowance. */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
/* A contact may send this many messages a minute before the agent stops answering them (the owner's account limit,
   lib/agent-meter, applies as well). */
const PER_CONTACT_PER_MIN = 6;

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams, want = setting("WHATSAPP_VERIFY_TOKEN");
  if (q.get("hub.mode") === "subscribe" && want && same(q.get("hub.verify_token") ?? "", want)) {
    return new Response(q.get("hub.challenge") ?? "", { headers: { "Content-Type": "text/plain" } });
  }
  return fail(403, "bad_token", "Verification failed.");
}

export async function POST(req: NextRequest) {
  if (!hasWhatsapp()) return fail(503, "whatsapp_off", "WhatsApp is not set up on this server.");
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), setting("WHATSAPP_APP_SECRET") ?? "")) return fail(401, "bad_signature", "Signature check failed.");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return fail(400, "invalid_json", "Not JSON."); }
  const messages = parseWebhook(body);
  if (messages.length) after(() => Promise.all(messages.map(answer)));
  return new Response(null, { status: 200 });
}

async function answer(m: Incoming) {
  const found = await agentForWhatsapp(m.phoneNumberId).catch(() => null);
  if (!found) return;
  const { agent, userId } = found;
  const conv = await recentWhatsapp(userId, agent.id, m.from).catch(() => null);
  const turns = conv?.turns ?? [];
  if (turns.some(t => t.ref === m.id)) return;                                   // Meta delivered it again
  const minuteAgo = Date.now() - 60_000;
  if (turns.filter(t => t.role === "caller" && Date.parse(t.at) > minuteAgo).length >= PER_CONTACT_PER_MIN) return;
  await markRead(m.phoneNumberId, m.id);
  try {
    let heard = "";
    if (m.kind === "text") heard = m.text;
    else {
      const media = await downloadMedia(m.mediaId);
      heard = (await transcribe(userId, media.data, media.type.split(";")[0] || "audio/ogg")).trim();
    }
    if (!heard) return;
    const text = await reply(userId, agent, await bodiesOf(userId, agent.id), turns, heard);
    const spoken = await say(userId, agent, text, { opus: true }).catch(() => null);
    if (spoken?.type === "audio/ogg") await sendVoice(m.phoneNumberId, m.from, spoken.audio);
    else await sendText(m.phoneNumberId, m.from, text);
    await appendTurns(userId, agent.id, conv?.id ?? null, "whatsapp", m.from, [{ ...nowTurn("caller", heard), ref: m.id }, nowTurn("agent", text)]);
  } catch (e) {
    console.error("whatsapp turn failed", { agent: agent.id, error: e instanceof Error ? e.message.slice(0, 120) : "unknown" });
  }
}
