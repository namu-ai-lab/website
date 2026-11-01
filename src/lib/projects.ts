import "server-only";
import { sql, tx } from "@/lib/db";
import { isLangCode, isOutputId } from "@/lib/catalog";
import { titleFrom, type Message, type NewMessage } from "@/lib/project-shape";

/* Create's messages in Postgres (db/migrations/0006_platform.sql): each message is a project (what was written, where
   it will be heard) with one version (the words said in a local language, and the voice). Every query filters on the
   owner's user_id. Text only: the sound is made again from the words when it is needed. */

type Row = { id: string; title: string; source_lang: string; source_text: string; made_for: string; updated_at: Date; lang: string | null; text: string | null; voice: string | null };

const message = (r: Row): Message => ({
  id: r.id, title: r.title, sourceLang: isLangCode(r.source_lang) ? r.source_lang : "fr", sourceText: r.source_text,
  lang: r.lang && isLangCode(r.lang) ? r.lang : "ha", text: r.text ?? "", voice: r.voice,
  madeFor: isOutputId(r.made_for) ? r.made_for : "whatsapp", updatedAt: r.updated_at.toISOString(),
});

/** The user's latest messages, newest first, each with its spoken words. */
export async function listMessages(userId: string, limit = 20): Promise<Message[]> {
  const rows = await sql<Row>(`select p.id::text, p.title, p.source_lang, p.source_text, p.made_for, p.updated_at, v.lang, v.text, v.voice
    from public.projects p
    left join lateral (select lang, text, voice from public.project_versions where project_id = p.id order by updated_at desc limit 1) v on true
    where p.user_id = $1 order by p.updated_at desc limit $2`, [userId, limit]);
  return rows.map(message);
}

/** How many messages one account may keep. */
export const MAX_MESSAGES = 500;

/** Keeps a message made in Create: its project and its version, together or not at all. */
export async function saveMessage(userId: string, m: NewMessage): Promise<Message> {
  return tx(async q => {
    const [{ n }] = await q<{ n: number }>("select count(*)::int as n from public.projects where user_id = $1", [userId]);
    if (n >= MAX_MESSAGES) throw new RangeError("too_many_messages");
    const [p] = await q<{ id: string; title: string; updated_at: Date }>(`insert into public.projects (user_id, title, kind, source_lang, source_text, made_for)
      values ($1, $2, 'message', $3, $4, $5) returning id::text, title, updated_at`,
      [userId, titleFrom(m.sourceText || m.text) || "…", m.sourceLang, m.sourceText, m.madeFor]);
    await q("insert into public.project_versions (project_id, lang, text, voice) values ($1, $2, $3, $4)", [p.id, m.lang, m.text, m.voice]);
    return { ...m, id: p.id, title: p.title, updatedAt: p.updated_at.toISOString() };
  });
}
