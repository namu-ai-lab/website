import "server-only";
import { sql } from "@/lib/db";
import { SCOPES, type Scope } from "@/lib/key-shape";

/* Usage for one account over a period, grouped by model or by key: the console's Usage page and its CSV export read
   the same numbers from here. Periods are in UTC, as the gateway's monthly allowance is. */
export const RANGES = ["month", "last", "7d", "30d"] as const;
export type Range = (typeof RANGES)[number];
export type GroupBy = "model" | "key";

const WINDOW: Record<Range, [string, string]> = {
  month: ["date_trunc('month', now())", "now()"],
  last: ["date_trunc('month', now()) - interval '1 month'", "date_trunc('month', now())"],
  "7d": ["date_trunc('day', now()) - interval '6 days'", "now()"],
  "30d": ["date_trunc('day', now()) - interval '29 days'", "now()"],
};

export type Group = { id: string; label: string; scope?: Scope };
export type Totals = { group: string; requests: number; errors: number; audioMin: number; chars: number; latencyMs: number | null };
export type Day = { day: string; group: string; requests: number };
export type UsageData = { from: string; to: string; days: string[]; groups: Group[]; totals: Totals[]; daily: Day[] };

/** groupLabel names the Playground and deleted keys in the reader's language. */
export async function usageFor(userId: string, range: Range, by: GroupBy, names: { playground: string; deleted: string }): Promise<UsageData> {
  const [from, to] = WINDOW[range];
  // The group: the model, or the key (the website's service key is the Playground; a missing key, a deleted one).
  const g = by === "model" ? "e.endpoint" : "case when k.is_service then 'playground' else coalesce(k.id::text, 'deleted') end";
  const base = `from public.usage_events e left join public.api_keys k on k.id = e.key_id where e.user_id = $1 and e.created_at >= ${from} and e.created_at < ${to}`;
  const [[span], totals, daily, keys] = await Promise.all([
    sql<{ f: string; t: string }>(`select to_char((${from}) at time zone 'UTC', 'YYYY-MM-DD') as f, to_char(((${to}) - interval '1 second') at time zone 'UTC', 'YYYY-MM-DD') as t`),
    sql<{ grp: string; requests: number; errors: number; audio: string; chars: number; latency: string | null }>(`select ${g} as grp, count(*)::int as requests,
      count(*) filter (where e.status >= 400)::int as errors, coalesce(sum(e.audio_seconds), 0) as audio, coalesce(sum(e.characters), 0)::int as chars,
      avg(e.latency_ms) filter (where e.status < 400) as latency ${base} group by 1`, [userId]),
    sql<Day>(`select to_char(e.created_at at time zone 'UTC', 'YYYY-MM-DD') as day, ${g} as "group", count(*)::int as requests ${base} group by 1, 2`, [userId]),
    by === "key" ? sql<{ id: string; name: string; prefix: string }>("select id::text, name, prefix from public.api_keys where user_id = $1", [userId]) : Promise.resolve([]),
  ]);

  const days: string[] = [];
  for (let d = new Date(`${span.f}T00:00:00Z`); d <= new Date(`${span.t}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
  const seen = new Set(totals.map(t => t.grp));
  const groups: Group[] = by === "model"
    ? SCOPES.map(s => ({ id: s, label: s, scope: s }))
    : [...keys.filter(k => seen.has(k.id)).map(k => ({ id: k.id, label: `${k.name} (${k.prefix}…)` })),
       ...(seen.has("playground") ? [{ id: "playground", label: names.playground }] : []),
       ...(seen.has("deleted") ? [{ id: "deleted", label: names.deleted }] : [])];
  return {
    from: span.f, to: span.t, days, groups, daily,
    totals: totals.map(t => ({ group: t.grp, requests: t.requests, errors: t.errors, audioMin: Number(t.audio) / 60, chars: t.chars, latencyMs: t.latency === null ? null : Number(t.latency) })),
  };
}

export type FirstRequest = { endpoint: string; status: number; at: string; latencyMs: number };

/** The account's latest request through one of its own keys, not the Playground's: what the API door's first visit
    waits for. */
export async function latestApiRequest(userId: string): Promise<FirstRequest | null> {
  const [r] = await sql<{ endpoint: string; status: number; created_at: Date; latency_ms: number }>(`select e.endpoint, e.status, e.created_at, e.latency_ms
    from public.usage_events e join public.api_keys k on k.id = e.key_id
    where e.user_id = $1 and not k.is_service order by e.created_at desc, e.id desc limit 1`, [userId]);
  return r ? { endpoint: r.endpoint, status: r.status, at: r.created_at.toISOString(), latencyMs: r.latency_ms } : null;
}
