import "server-only";
import { sql, tx } from "@/lib/db";
import { isLangCode } from "@/lib/catalog";
import { PRINT_TURNS, readPrint, readTurn, type Interpretation, type InterpretationSummary, type PrintTurn, type Turn } from "@/lib/interpretation-shape";
import { titleFrom } from "@/lib/project-shape";

/* Create's Interpreter in Postgres (db/migrations/0008_interpretations.sql): one row per conversation, its turns in a
   JSON array, oldest first. Every query filters on the owner's user_id. Text only: the recordings stay in the browser,
   and the translations' voices are made again from their words. */

/** How many conversations one account may keep, and how many turns one conversation holds. */
export const MAX_INTERPRETATIONS = 300;
export const MAX_TURNS = 200;

type Row = { id: string; title: string; turns: unknown; updated_at: Date };

const full = (r: Row): Interpretation => ({
  id: r.id, title: r.title, updatedAt: r.updated_at.toISOString(),
  turns: (Array.isArray(r.turns) ? r.turns : []).map(readTurn).filter((t): t is Turn => t !== null),
});

/** The user's conversations, last used first, each with its first turns drawn (who spoke, how long, the voice's
    outline; never the words). */
export async function listInterpretations(userId: string, limit = 60): Promise<InterpretationSummary[]> {
  const rows = await sql<{ id: string; first: string | null; n: number; updated_at: Date; print: unknown }>(`select id::text,
    turns -> 0 ->> 'from' as first, jsonb_array_length(turns)::int as n, updated_at,
    (select coalesce(jsonb_agg(jsonb_build_object('from', e.v -> 'from', 'seconds', e.v -> 'seconds', 'peaks', e.v -> 'peaks') order by e.i), '[]'::jsonb)
       from jsonb_array_elements(turns) with ordinality as e(v, i) where e.i <= $3) as print
    from public.interpretations where user_id = $1 order by updated_at desc limit $2`, [userId, limit, PRINT_TURNS]);
  return rows.map(r => ({
    id: r.id, from: isLangCode(r.first) ? r.first : "ha", count: r.n, updatedAt: r.updated_at.toISOString(),
    print: (Array.isArray(r.print) ? r.print : []).map(readPrint).filter((x): x is PrintTurn => x !== null),
  }));
}

/** One conversation with its turns; null when it is not the user's. */
export async function getInterpretation(userId: string, id: string): Promise<Interpretation | null> {
  const [r] = await sql<Row>("select id::text, title, turns, updated_at from public.interpretations where id = $1 and user_id = $2", [id, userId]);
  return r ? full(r) : null;
}

/** Adds a turn: to conversation `id`, or to a new one when `id` is null. RangeError when the account or the
    conversation is full; null when `id` is not the user's. */
export async function addTurn(userId: string, id: string | null, turn: Omit<Turn, "at">): Promise<{ id: string; turn: Turn } | null> {
  const at = new Date().toISOString(), kept: Turn = { ...turn, at };
  if (id) {
    const [r] = await sql<{ n: number }>(`update public.interpretations set turns = turns || jsonb_build_array($3::jsonb), updated_at = now()
      where id = $1 and user_id = $2 and jsonb_array_length(turns) < $4 returning jsonb_array_length(turns)::int as n`, [id, userId, JSON.stringify(kept), MAX_TURNS]);
    if (r) return { id, turn: kept };
    const [here] = await sql<{ one: number }>("select 1 as one from public.interpretations where id = $1 and user_id = $2", [id, userId]);
    if (here) throw new RangeError("too_many_turns");
    return null;
  }
  return tx(async q => {
    await q("select pg_advisory_xact_lock(hashtext('interpretations:' || $1))", [userId]);   // the count and the insert, one request at a time
    const [{ n }] = await q<{ n: number }>("select count(*)::int as n from public.interpretations where user_id = $1", [userId]);
    if (n >= MAX_INTERPRETATIONS) throw new RangeError("too_many_interpretations");
    const [r] = await q<{ id: string }>("insert into public.interpretations (user_id, title, turns) values ($1, $2, jsonb_build_array($3::jsonb)) returning id::text",
      [userId, titleFrom(turn.heard || turn.text) || "…", JSON.stringify(kept)]);
    return { id: r.id, turn: kept };
  });
}

/** Deletes one conversation; whether there was one. */
export async function deleteInterpretation(userId: string, id: string): Promise<boolean> {
  const rows = await sql<{ id: string }>("delete from public.interpretations where id = $1 and user_id = $2 returning id::text", [id, userId]);
  return rows.length > 0;
}
