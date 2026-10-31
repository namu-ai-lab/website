/* Text before it is spoken: the letters people type without a keyboard for them, and the organisation's word list
   (its approved terms, names and acronyms, each with how to say it). Pure functions, browser-safe, shared by Create,
   the agents and the server routes. */
import { language, type LangCode } from "./languages";

/** One entry of an organisation's word list: `say` replaces `term` when it is spoken, in `lang` or in every language. */
export type Word = { term: string; say: string; lang: LangCode | null };

/** Replaces each typed stand-in for a missing letter (Hausa b' for ɓ...) with the letter itself. */
export function fixLetters(text: string, lang: LangCode): string {
  const pairs = Object.entries(language(lang).digraphs);
  if (!pairs.length) return text;
  const re = new RegExp(pairs.map(([k]) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
  const map = new Map(pairs);
  return text.replace(re, m => map.get(m) ?? m);
}

/** Whether the text holds stand-ins that fixLetters would change. */
export const hasStandIns = (text: string, lang: LangCode) => fixLetters(text, lang) !== text;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Says each listed term as its `say`, whole words only, longest terms first, the case of the list as written.
    Entries for another language are skipped. */
export function applyWords(text: string, words: readonly Word[], lang: LangCode): string {
  const usable = words.filter(w => w.term.trim() && w.say.trim() && (w.lang === null || w.lang === lang))
    .sort((a, b) => b.term.length - a.term.length);
  if (!usable.length) return text;
  const map = new Map(usable.map(w => [w.term.trim().toLowerCase(), w.say.trim()]));
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${usable.map(w => escape(w.term.trim())).join("|")})(?![\\p{L}\\p{N}])`, "giu");
  return text.replace(re, m => map.get(m.toLowerCase()) ?? m);
}
