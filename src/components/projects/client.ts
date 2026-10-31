/* What Create's home, projects and video translation ask of the server, from the browser. Every call goes through
   the site's own routes as the signed-in user; a failure throws an Error carrying the route's message. */
import { LANGUAGES, can, canTranslate, type LangCode } from "@/lib/catalog";
import type { Project, Version } from "@/lib/project-shape";

async function ok(res: Response): Promise<Response> {
  if (res.ok) return res;
  const j = await res.json().catch(() => null) as { error?: { message?: string; type?: string } } | null;
  const e = new Error(j?.error?.message ?? `HTTP ${res.status}`) as Error & { type?: string; status?: number };
  e.type = j?.error?.type; e.status = res.status;
  throw e;
}
const json = (method: string, body: unknown) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const createProject = async (p: { sourceLang: LangCode; sourceText?: string; title?: string; kind?: Project["kind"] }) =>
  ((await (await ok(await fetch("/api/projects", json("POST", p)))).json()) as { project: Project }).project;

export const patchProject = async (id: string, p: Partial<Pick<Project, "title" | "sourceLang" | "sourceText" | "madeFor">>) =>
  ((await (await ok(await fetch(`/api/projects/${id}`, json("PATCH", p)))).json()) as { project: Project }).project;

export const removeProject = async (id: string) => { await ok(await fetch(`/api/projects/${id}`, { method: "DELETE" })); };

export const putVersion = async (id: string, lang: LangCode, v: Partial<Pick<Version, "text" | "voice" | "status">>) =>
  ((await (await ok(await fetch(`/api/projects/${id}/versions/${lang}`, json("PUT", v)))).json()) as { version: Version }).version;

export const translate = async (text: string, from: LangCode, to: LangCode) =>
  ((await (await ok(await fetch("/api/create/translate", json("POST", { text, from, to })))).json()) as { text: string }).text;

export const speak = async (text: string, lang: LangCode, voice: string | null) =>
  (await ok(await fetch("/api/create/speak", json("POST", { text, lang, voice })))).blob();

export const interpret = async (audio: Blob, from: LangCode, to: LangCode) =>
  (await (await ok(await fetch(`/api/create/interpret?from=${from}&to=${to}`, { method: "POST", headers: { "Content-Type": audio.type || "audio/wav" }, body: audio }))).json()) as { sourceText: string; text: string };

export const kitVoices = async (): Promise<Partial<Record<string, string>>> => {
  try { return ((await (await ok(await fetch("/api/kit"))).json()) as { voices?: Partial<Record<string, string>> }).voices ?? {}; }
  catch { return {}; }
};

/** How a recording in `lang` becomes text, if it can: transcription where a model reads the language, else the
    translation model, which also says what it heard. */
export function dictation(lang: LangCode): ((audio: Blob) => Promise<string>) | null {
  if (can("transcribe", lang)) return async audio => {
    const res = await ok(await fetch(`/api/create/listen?lang=${lang}`, { method: "POST", headers: { "Content-Type": audio.type || "audio/wav" }, body: audio }));
    return ((await res.json()) as { text: string }).text;
  };
  const to = LANGUAGES.map(l => l.code).find(c => c !== lang && canTranslate(lang, c));
  if (to) return async audio => (await interpret(audio, lang, to)).sourceText;
  return null;
}

/** Saves a file the browser holds. */
export function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
