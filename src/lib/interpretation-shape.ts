/* A conversation through Create's Interpreter as the browser holds it: turns in time, each one person speaking a
   language and Namu putting it into the other. Kept in public.interpretations (db/migrations/0008_interpretations.sql);
   lib/interpretations reads and writes them. Browser-safe. */
import { canTranslate, isLangCode, isVoiceId, voicesFor, type LangCode } from "@/lib/catalog";
import { MAX_TEXT } from "@/lib/project-shape";

export type Turn = {
  id: string;
  /** what was spoken, and what Namu heard in it */
  from: LangCode; heard: string;
  /** the language it was put into, the words, and the voice that says them (null where the language has none) */
  to: LangCode; text: string; voice: string | null;
  /** the recording's length, and the outline of its waveform (0 to 100), to draw it where the sound is not kept */
  seconds: number; peaks: number[];
  at: string;
};
export type Interpretation = { id: string; title: string; turns: Turn[]; updatedAt: string };
/** A turn as the history draws it: who spoke (by language), how long, and the outline of the voice. No words. */
export type PrintTurn = { from: LangCode; seconds: number; peaks: number[] };
/** A conversation in the history: when it was last used, how many turns, and its first turns' voices, drawn. */
export type InterpretationSummary = { id: string; from: LangCode; count: number; updatedAt: string; print: PrintTurn[] };
/** How many turns the history draws for a conversation. */
export const PRINT_TURNS = 24;

export const PEAKS = 40;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (x: unknown): x is string => typeof x === "string" && UUID.test(x);

/** A turn from the browser, made safe to store; null when it lacks the words, the id or a pair Namu translates. */
export const cleanTurn = (j: Record<string, unknown>) => (isLangCode(j.from) && isLangCode(j.to) && canTranslate(j.from, j.to) ? parse(j) : null);

function parse(j: Record<string, unknown>): Omit<Turn, "at"> | null {
  const { from, to } = j;
  if (!isUuid(j.id) || !isLangCode(from) || !isLangCode(to) || from === to) return null;
  const heard = typeof j.heard === "string" ? j.heard.trim().slice(0, MAX_TEXT) : "";
  const text = typeof j.text === "string" ? j.text.trim().slice(0, MAX_TEXT) : "";
  if (!text) return null;
  const voice = isVoiceId(j.voice) && voicesFor(to).some(v => v.id === j.voice) ? j.voice : null;
  const seconds = typeof j.seconds === "number" && Number.isFinite(j.seconds) ? Math.min(3600, Math.max(0, Math.round(j.seconds * 10) / 10)) : 0;
  const peaks = Array.isArray(j.peaks)
    ? j.peaks.slice(0, PEAKS).map(p => (typeof p === "number" && Number.isFinite(p) ? Math.min(100, Math.max(0, Math.round(p))) : 0))
    : [];
  return { id: j.id.toLowerCase(), from, heard, to, text, voice, seconds, peaks };
}

/** A turn's drawing read back from the database; null for anything damaged. */
export function readPrint(x: unknown): PrintTurn | null {
  if (!x || typeof x !== "object") return null;
  const j = x as Record<string, unknown>;
  if (!isLangCode(j.from)) return null;
  const seconds = typeof j.seconds === "number" && Number.isFinite(j.seconds) ? Math.max(0, j.seconds) : 0;
  const peaks = Array.isArray(j.peaks) ? j.peaks.slice(0, PEAKS).map(p => (typeof p === "number" && Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : 0)) : [];
  return { from: j.from, seconds, peaks };
}

/** A stored turn read back, even for a pair Namu no longer offers; null for anything damaged (skipped, not shown). */
export function readTurn(x: unknown): Turn | null {
  if (!x || typeof x !== "object") return null;
  const j = x as Record<string, unknown>;
  const t = parse(j);
  return t && typeof j.at === "string" ? { ...t, at: j.at } : null;
}
