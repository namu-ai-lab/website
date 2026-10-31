/* A Create project as the browser holds it: one message, its source in the language it was written or spoken in,
   and a version per local language, each with its own text, voice and review status. Browser-safe; lib/projects
   reads and writes them. */
import { LOCAL, isLangCode, isOutputId, type LangCode, type OutputId } from "@/lib/catalog";

export const KINDS = ["message", "long", "video"] as const;
export type ProjectKind = (typeof KINDS)[number];
export const STATUSES = ["draft", "review", "checked"] as const;
export type VersionStatus = (typeof STATUSES)[number];

export type Version = { lang: LangCode; text: string; voice: string | null; status: VersionStatus; updatedAt: string };
export type Project = {
  id: string; title: string; kind: ProjectKind; sourceLang: LangCode; sourceText: string; madeFor: OutputId;
  createdAt: string; updatedAt: string; versions: Version[];
};
export type ProjectSummary = Pick<Project, "id" | "title" | "kind" | "sourceLang" | "updatedAt"> & { versions: { lang: LangCode; status: VersionStatus; filled: boolean }[] };

export const MAX_TITLE = 200;
export const MAX_TEXT = 20000;

export const isKind = (x: unknown): x is ProjectKind => (KINDS as readonly unknown[]).includes(x);
export const isStatus = (x: unknown): x is VersionStatus => (STATUSES as readonly unknown[]).includes(x);
export const isUuid = (x: unknown): x is string => typeof x === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);

/** A project's title from the first words of its text: up to `max` characters, cut at a word. */
export function titleFrom(text: string, max = 60): string {
  const one = text.replace(/\s+/g, " ").trim();
  if (one.length <= max) return one;
  const cut = one.slice(0, max);
  if (one[max] === " ") return `${cut.replace(/[\s,.;:!?–-]+$/, "")}…`;
  const at = cut.lastIndexOf(" ");
  return `${(at > max / 2 ? cut.slice(0, at) : cut).replace(/[\s,.;:!?–-]+$/, "")}…`;
}

/** The languages a project shows as versions: the local languages, without the one it was written in. */
export const versionLangs = (source: LangCode): LangCode[] => LOCAL.filter(l => l !== source);

/** A file name for a version: the project's title and the language, safe on every system. */
export function fileName(title: string, endonym: string, ext: string): string {
  const base = `${title}-${endonym}`.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\w\-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  return `${base || "namu"}.${ext}`;
}

/** A body from the browser, made safe to store; undefined fields are left as they are. */
export function cleanPatch(j: Record<string, unknown>) {
  return {
    title: typeof j.title === "string" && j.title.trim() ? j.title.trim().slice(0, MAX_TITLE) : undefined,
    sourceLang: isLangCode(j.sourceLang) ? j.sourceLang : undefined,
    sourceText: typeof j.sourceText === "string" ? j.sourceText.slice(0, MAX_TEXT) : undefined,
    madeFor: isOutputId(j.madeFor) ? j.madeFor : undefined,
    kind: isKind(j.kind) ? j.kind : undefined,
  };
}
