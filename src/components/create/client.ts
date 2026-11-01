/* What Create asks of the server, from the browser. Every call goes through the site's own routes as the signed-in
   user; a failure throws an Error carrying the route's message. */
import { LANGUAGES, can, canTranslate, type LangCode, type OutputId } from "@/lib/catalog";
import { render } from "@/lib/audio-out";
import type { Message, NewMessage } from "@/lib/project-shape";

async function ok(res: Response): Promise<Response> {
  if (res.ok) return res;
  const j = await res.json().catch(() => null) as { error?: { message?: string; type?: string } } | null;
  const e = new Error(j?.error?.message ?? `HTTP ${res.status}`) as Error & { type?: string; status?: number };
  e.type = j?.error?.type; e.status = res.status;
  throw e;
}
const json = (method: string, body: unknown) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const audioPost = (body: Blob) => ({ method: "POST", headers: { "Content-Type": body.type || "audio/wav" }, body });

export const translate = async (text: string, from: LangCode, to: LangCode) =>
  ((await (await ok(await fetch("/api/create/translate", json("POST", { text, from, to })))).json()) as { text: string }).text;

/* The same words in the same voice sound the same: made once per page, then played from here. */
const spoken = new Map<string, Promise<Blob>>();
export function speak(text: string, lang: LangCode, voice: string | null): Promise<Blob> {
  const key = `${lang}|${voice ?? ""}|${text}`;
  let p = spoken.get(key);
  if (!p) {
    p = fetch("/api/create/speak", json("POST", { text, lang, voice })).then(ok).then(r => r.blob());
    spoken.set(key, p);
    p.catch(() => spoken.delete(key));
  }
  return p;
}

export const interpret = async (audio: Blob, from: LangCode, to: LangCode) =>
  (await (await ok(await fetch(`/api/create/interpret?from=${from}&to=${to}`, audioPost(audio)))).json()) as { sourceText: string; text: string };

export const listen = async (audio: Blob, lang: LangCode, to?: LangCode) =>
  (await (await ok(await fetch(`/api/create/listen?lang=${lang}${to ? `&to=${to}` : ""}`, audioPost(audio)))).json()) as { text: string; translation?: string };

export const keep = async (m: NewMessage) =>
  ((await (await ok(await fetch("/api/create/messages", json("POST", m)))).json()) as { message: Message }).message;

/** How a recording in `lang` becomes text, if it can: transcription where a model reads the language, else the
    translation model, which also says what it heard. */
export function dictation(lang: LangCode): ((audio: Blob) => Promise<string>) | null {
  if (can("transcribe", lang)) return async audio => (await listen(audio, lang)).text;
  const to = LANGUAGES.map(l => l.code).find(c => c !== lang && canTranslate(lang, c));
  if (to) return async audio => (await interpret(audio, lang, to)).sourceText;
  return null;
}

/** A message's sound as the file its channel needs (WhatsApp: Ogg Opus; radio and phone lines: WAV at their rate). */
export async function fileFor(wav: Blob, target: OutputId, name: string): Promise<File> {
  const f = await render(wav, target);
  return new File([f.blob], `${name}.${f.ext}`, { type: f.type });
}

/** Saves a file the browser holds. */
export function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Hands a file to the phone's share sheet (WhatsApp is there on phones); saves it where a browser cannot share files. */
export async function share(file: File): Promise<void> {
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file] }); return; }
    catch (e) { if (e instanceof DOMException && e.name === "AbortError") return; }
  }
  save(file, file.name);
}
