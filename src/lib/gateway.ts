import "server-only";
import { setting } from "@/lib/env";
import { apiBase } from "@/lib/public-config";
import type { LangCode } from "@/lib/catalog";

/* The platform's calls to the models, from the server, on behalf of a signed-in user: the gateway with the website's
   service key (NAMU_SERVICE_KEY) naming the user's account (X-Namu-Account), so each run counts against that account's
   allowance and shows in its usage and logs, exactly as the console Playground does. The browser never holds a key.
   Create's tools, projects and the agents' test calls all come through here. */

export class GatewayError extends Error {
  constructor(readonly status: number, readonly type: string, message: string) { super(message); }
}

export const hasGateway = () => Boolean(setting("NAMU_SERVICE_KEY"));

/** One gateway request as a user. Throws GatewayError with the gateway's own error type on a failure. */
export async function gateway(userId: string, path: `/v1/${string}`, init: { body: BodyInit; type: string; query?: Record<string, string>; timeoutMs?: number }) {
  const key = setting("NAMU_SERVICE_KEY");
  if (!key) throw new GatewayError(503, "platform_unavailable", "The models are not switched on for this deployment.");
  const q = init.query && Object.keys(init.query).length ? `?${new URLSearchParams(init.query)}` : "";
  let res: Response;
  try {
    res = await fetch(`${apiBase}${path}${q}`, {
      method: "POST", body: init.body, cache: "no-store", signal: AbortSignal.timeout(init.timeoutMs ?? 290_000),
      headers: { Authorization: `Bearer ${key}`, "X-Namu-Account": userId, "Content-Type": init.type },
    });
  } catch {
    throw new GatewayError(504, "upstream_timeout", "The model took too long to answer. Try again: the first request wakes it.");
  }
  if (!res.ok) {
    const j = await res.json().catch(() => null) as { error?: { type?: string; message?: string } } | null;
    throw new GatewayError(res.status, j?.error?.type ?? "upstream_error", j?.error?.message ?? `The model answered ${res.status}.`);
  }
  return res;
}

/** Speech for a text in a voice: WAV bytes. */
export async function speak(userId: string, text: string, voice: string): Promise<ArrayBuffer> {
  const res = await gateway(userId, "/v1/speech", { body: JSON.stringify({ text, voice }), type: "application/json" });
  return res.arrayBuffer();
}

/** What was said in a recording. */
export async function transcribe(userId: string, audio: ArrayBuffer, type: string): Promise<string> {
  const res = await gateway(userId, "/v1/transcribe", { body: audio, type });
  return ((await res.json()) as { text?: string }).text ?? "";
}

export type Translation = { sourceText: string; text: string; audio: string | null };

/** A recording in one language, heard and said again in another: what was heard, its translation, and the
    translation spoken (base64 WAV). */
export async function translateSpeech(userId: string, audio: ArrayBuffer, type: string, source: LangCode, target: LangCode): Promise<Translation> {
  const res = await gateway(userId, "/v1/translate", { body: audio, type, query: { source, target, include_audio: "1" } });
  const j = await res.json() as { source_text?: string; text?: string; audio?: string };
  return { sourceText: j.source_text ?? "", text: j.text ?? "", audio: j.audio ?? null };
}

/** A text in one language, in another. The gateway takes text directly once it is deployed with text translation
    (JSON { text, source, target }); until then a gateway that only takes speech answers 400 or 415, and the text is
    spoken in its own language and that speech translated instead, which reaches the same model by its speech door.
    Both runs count against the user's allowance. */
export async function translateText(userId: string, text: string, source: LangCode, target: LangCode, sourceVoice: string | null): Promise<Translation> {
  try {
    const res = await gateway(userId, "/v1/translate", { body: JSON.stringify({ text, source, target }), type: "application/json", query: { include_audio: "1" } });
    const j = await res.json() as { source_text?: string; text?: string; audio?: string };
    if (typeof j.text === "string" && j.text) return { sourceText: text, text: j.text, audio: j.audio ?? null };
  } catch (e) {
    if (!(e instanceof GatewayError) || ![400, 415, 422].includes(e.status) || !sourceVoice) throw e;
  }
  // A gateway without text translation: say the text, then translate the speech. French has no voice, so it cannot.
  if (!sourceVoice) throw new GatewayError(502, "upstream_error", "The model could not answer.");
  const spoken = await speak(userId, text, sourceVoice);
  const out = await translateSpeech(userId, spoken, "audio/wav", source, target);
  return { ...out, sourceText: text };
}

/** The error a route returns for a failed model call, in the gateway's own shape. */
export const gatewayFailure = (e: unknown) =>
  e instanceof GatewayError ? { status: e.status, type: e.type, message: e.message } : { status: 502, type: "upstream_error", message: "The model could not answer." };
