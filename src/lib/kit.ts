import "server-only";
import { sql, tx } from "@/lib/db";
import { isLangCode, isVoiceId, type LangCode } from "@/lib/catalog";
import type { Word } from "@/lib/catalog/text";

/* An organisation's kit, used everywhere it speaks: its word list (terms and how to say them) and the voice it
   chose for each language. Rows belong to the user; every query filters on user_id. */

export type KitWord = Word & { id: string };
export const MAX_WORDS = 500;

export async function wordsOf(userId: string): Promise<KitWord[]> {
  const rows = await sql<{ id: string; term: string; say: string; lang: string | null }>(
    "select id::text, term, say, lang from public.kit_words where user_id = $1 order by created_at, id limit 500", [userId]);
  return rows.map(r => ({ id: r.id, term: r.term, say: r.say, lang: r.lang && isLangCode(r.lang) ? r.lang : null }));
}

/** Replaces the whole list (the kit page saves it as one), keeping only well-formed entries. */
export async function saveWords(userId: string, words: Word[]): Promise<KitWord[]> {
  const clean = words
    .map(w => ({ term: w.term.trim().slice(0, 80), say: w.say.trim().slice(0, 200), lang: w.lang && isLangCode(w.lang) ? w.lang : null }))
    .filter(w => w.term && w.say)
    .slice(0, MAX_WORDS);
  await tx(async q => {
    await q("delete from public.kit_words where user_id = $1", [userId]);
    if (clean.length) await q(`insert into public.kit_words (user_id, term, say, lang)
      select $1, t.term, t.say, t.lang from jsonb_to_recordset($2::jsonb) as t(term text, say text, lang text)`, [userId, JSON.stringify(clean)]);
  });
  return wordsOf(userId);
}

export async function voicesOf(userId: string): Promise<Partial<Record<LangCode, string>>> {
  const rows = await sql<{ lang: string; voice: string }>("select lang, voice from public.kit_voices where user_id = $1", [userId]);
  return Object.fromEntries(rows.filter(r => isLangCode(r.lang) && isVoiceId(r.voice)).map(r => [r.lang, r.voice]));
}

export async function setVoice(userId: string, lang: LangCode, voice: string | null) {
  if (voice === null) await sql("delete from public.kit_voices where user_id = $1 and lang = $2", [userId, lang]);
  else await sql(`insert into public.kit_voices (user_id, lang, voice) values ($1, $2, $3)
    on conflict (user_id, lang) do update set voice = excluded.voice`, [userId, lang, voice]);
}
