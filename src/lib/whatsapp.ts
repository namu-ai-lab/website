import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { setting } from "@/lib/env";

/* WhatsApp for Namu Agents, through Meta's WhatsApp Cloud API: people send an agent a voice note (or text) and it
   answers with a voice note in its own voice (or text, while the gateway cannot yet make Ogg Opus). One Meta app
   serves every agent: WHATSAPP_TOKEN (a system user's token with whatsapp_business_messaging), WHATSAPP_APP_SECRET
   (to check that a call comes from Meta) and WHATSAPP_VERIFY_TOKEN (the word Meta sends back when the webhook is
   registered). Each agent names its phone number id in agents.channels. Server-only. */

const GRAPH = "https://graph.facebook.com/v21.0";

export const hasWhatsapp = () => Boolean(setting("WHATSAPP_TOKEN") && setting("WHATSAPP_APP_SECRET") && setting("WHATSAPP_VERIFY_TOKEN"));

/** Meta signs each call's raw body: X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(app secret, body), in hex. */
export function verifySignature(raw: string | Uint8Array, header: string | null, secret: string): boolean {
  if (!header?.startsWith("sha256=") || !secret) return false;
  const want = createHmac("sha256", secret).update(raw).digest();
  let got: Buffer;
  try { got = Buffer.from(header.slice(7), "hex"); } catch { return false; }
  return got.length === want.length && timingSafeEqual(got, want);
}

export type Incoming =
  | { phoneNumberId: string; from: string; id: string; kind: "text"; text: string }
  | { phoneNumberId: string; from: string; id: string; kind: "audio"; mediaId: string; mime: string };

/** The messages in a webhook call that an agent can answer: text and audio (voice notes). Statuses and other kinds
    (images, stickers, reactions) are left out. */
export function parseWebhook(body: unknown): Incoming[] {
  const out: Incoming[] = [];
  const entries = (body as { entry?: unknown })?.entry;
  if (!Array.isArray(entries)) return out;
  for (const e of entries) for (const c of (e as { changes?: unknown[] })?.changes ?? []) {
    const v = (c as { value?: { metadata?: { phone_number_id?: unknown }; messages?: unknown[] } })?.value;
    const phoneNumberId = String(v?.metadata?.phone_number_id ?? "");
    if (!phoneNumberId) continue;
    for (const m of v?.messages ?? []) {
      const msg = m as { from?: unknown; id?: unknown; type?: unknown; text?: { body?: unknown }; audio?: { id?: unknown; mime_type?: unknown } };
      const from = typeof msg.from === "string" ? msg.from : "", id = typeof msg.id === "string" ? msg.id : "";
      if (!from || !id) continue;
      if (msg.type === "text" && typeof msg.text?.body === "string" && msg.text.body.trim()) out.push({ phoneNumberId, from, id, kind: "text", text: msg.text.body.trim() });
      if (msg.type === "audio" && typeof msg.audio?.id === "string") out.push({ phoneNumberId, from, id, kind: "audio", mediaId: msg.audio.id, mime: String(msg.audio.mime_type ?? "audio/ogg") });
    }
  }
  return out;
}

const token = () => setting("WHATSAPP_TOKEN") ?? "";
const auth = () => ({ Authorization: `Bearer ${token()}` });

/** A voice note's bytes: Meta gives a short-lived URL for the media id, which needs the same token. */
export async function downloadMedia(mediaId: string): Promise<{ data: ArrayBuffer; type: string }> {
  const meta = await fetch(`${GRAPH}/${encodeURIComponent(mediaId)}`, { headers: auth(), signal: AbortSignal.timeout(15_000) });
  if (!meta.ok) throw new Error(`media lookup ${meta.status}`);
  const { url, mime_type } = (await meta.json()) as { url?: string; mime_type?: string };
  if (!url) throw new Error("media without a url");
  const file = await fetch(url, { headers: auth(), signal: AbortSignal.timeout(30_000) });
  if (!file.ok) throw new Error(`media download ${file.status}`);
  return { data: await file.arrayBuffer(), type: mime_type ?? file.headers.get("content-type") ?? "audio/ogg" };
}

async function send(phoneNumberId: string, payload: object) {
  const r = await fetch(`${GRAPH}/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: "POST", headers: { ...auth(), "Content-Type": "application/json" }, signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  if (!r.ok) throw new Error(`send ${r.status}`);
}

export const sendText = (phoneNumberId: string, to: string, text: string) => send(phoneNumberId, { to, type: "text", text: { body: text.slice(0, 4096) } });

/** Uploads an Ogg Opus voice note, then sends it: WhatsApp shows it as a voice message. */
export async function sendVoice(phoneNumberId: string, to: string, audio: ArrayBuffer) {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "audio/ogg");
  form.append("file", new Blob([audio], { type: "audio/ogg" }), "reply.ogg");
  const up = await fetch(`${GRAPH}/${encodeURIComponent(phoneNumberId)}/media`, { method: "POST", headers: auth(), body: form, signal: AbortSignal.timeout(30_000) });
  if (!up.ok) throw new Error(`upload ${up.status}`);
  const { id } = (await up.json()) as { id?: string };
  if (!id) throw new Error("upload without an id");
  await send(phoneNumberId, { to, type: "audio", audio: { id } });
}

/** Marks a message read, so the sender sees the agent has it while the reply is made. */
export const markRead = (phoneNumberId: string, messageId: string) => send(phoneNumberId, { status: "read", message_id: messageId }).catch(() => {});
