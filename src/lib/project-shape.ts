/* A Create message as the browser holds it: what the organisation wrote (in the language it wrote it in), the words
   said in a local language, the voice that says them, and where it will be heard. Kept in the projects tables (one
   project, one version; db/migrations/0006_platform.sql). Browser-safe; lib/projects reads and writes them. */
import { isLangCode, isOutputId, type LangCode, type OutputId } from "@/lib/catalog";

export type Message = {
  id: string; title: string; sourceLang: LangCode; sourceText: string;
  lang: LangCode; text: string; voice: string | null; madeFor: OutputId; updatedAt: string;
};
export type NewMessage = Omit<Message, "id" | "title" | "updatedAt">;

export const MAX_TEXT = 20000;

/** A message's title from the first words of its text: up to `max` characters, cut at a word. */
export function titleFrom(text: string, max = 60): string {
  const one = text.replace(/\s+/g, " ").trim();
  if (one.length <= max) return one;
  const cut = one.slice(0, max);
  if (one[max] === " ") return `${cut.replace(/[\s,.;:!?–-]+$/, "")}…`;
  const at = cut.lastIndexOf(" ");
  return `${(at > max / 2 ? cut.slice(0, at) : cut).replace(/[\s,.;:!?–-]+$/, "")}…`;
}

/** A file name from a title and a language, safe on every system. */
export function fileName(title: string, endonym: string, ext: string): string {
  const base = `${title}-${endonym}`.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\w\-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  return `${base || "namu"}.${ext}`;
}

/** A message from the browser, made safe to store; null when it lacks the words or the languages. */
export function cleanMessage(j: Record<string, unknown>): NewMessage | null {
  const text = typeof j.text === "string" ? j.text.trim().slice(0, MAX_TEXT) : "";
  if (!text || !isLangCode(j.lang) || !isLangCode(j.sourceLang)) return null;
  return {
    sourceLang: j.sourceLang, sourceText: typeof j.sourceText === "string" ? j.sourceText.trim().slice(0, MAX_TEXT) : "",
    lang: j.lang, text, voice: typeof j.voice === "string" ? j.voice.slice(0, 40) : null,
    madeFor: isOutputId(j.madeFor) ? j.madeFor : "whatsapp",
  };
}
