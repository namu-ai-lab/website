import "server-only";
import { sql } from "@/lib/db";
import { isLangCode, isVoiceId, type LangCode } from "@/lib/catalog";
import type { Word } from "@/lib/catalog/text";

/* An organisation's kit, used everywhere it speaks: its word list (terms and how to say them) and the voice it
   chose for each language. Rows belong to the user; every query filters on user_id. (Create has no page to edit
   them yet; both read empty until it does.) */

export type KitWord = Word & { id: string };

export async function wordsOf(userId: string): Promise<KitWord[]> {
  const rows = await sql<{ id: string; term: string; say: string; lang: string | null }>(
    "select id::text, term, say, lang from public.kit_words where user_id = $1 order by created_at, id limit 500", [userId]);
  return rows.map(r => ({ id: r.id, term: r.term, say: r.say, lang: r.lang && isLangCode(r.lang) ? r.lang : null }));
}

export async function voicesOf(userId: string): Promise<Partial<Record<LangCode, string>>> {
  const rows = await sql<{ lang: string; voice: string }>("select lang, voice from public.kit_voices where user_id = $1", [userId]);
  return Object.fromEntries(rows.filter(r => isLangCode(r.lang) && isVoiceId(r.voice)).map(r => [r.lang, r.voice]));
}
