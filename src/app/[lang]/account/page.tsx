import type { Metadata } from "next";
import { NotConfigured } from "@/components/account/AccountShell";
import { AccountPaused } from "@/components/account/AccountPaused";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { Overview, type HomeRange, type Point, type Recent } from "@/components/console/Overview";
import { consoleCopy } from "@/content/console";
import { isLang, type Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { sql } from "@/lib/db";
import { hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = consoleCopy[l].overview.meta;
  return { title, description, robots: { index: false } };
}

/* The console's Home (components/console/Overview), after platform.openai.com: Get started, then the period's figures.
   ?range=24h|7d|14d|30d (7d by default): hours for a day, days otherwise, in UTC. Only this user's rows. */
const RANGES = { "24h": { n: 24, unit: "hour" }, "7d": { n: 7, unit: "day" }, "14d": { n: 14, unit: "day" }, "30d": { n: 30, unit: "day" } } as const;

export default async function Account({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ range?: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/account");
  const t = consoleCopy[lang].overview;
  const asked = (await searchParams).range;
  const range: HomeRange = asked && asked in RANGES ? asked as HomeRange : "7d";
  const { n, unit } = RANGES[range];
  const [buckets, [month], [done], recent] = await Promise.all([
    // one row per hour or day of the period, empty ones included
    sql<{ requests: number; errors: number; audio: string; chars: number; latency: string | null }>(`
      with b as (select generate_series(date_trunc('${unit}', now()) - interval '${n - 1} ${unit}', date_trunc('${unit}', now()), interval '1 ${unit}') as t)
      select count(e.id)::int as requests, count(e.id) filter (where e.status >= 400)::int as errors, coalesce(sum(e.audio_seconds), 0) as audio,
        coalesce(sum(e.characters), 0)::int as chars, avg(e.latency_ms) filter (where e.status < 400) as latency
      from b left join public.usage_events e on e.user_id = $1 and e.created_at >= b.t and e.created_at < b.t + interval '1 ${unit}'
      group by b.t order by b.t`, [user.id]),
    sql<{ audio_seconds: string }>(`select coalesce(sum(audio_seconds), 0) as audio_seconds from public.usage_events
      where user_id = $1 and created_at >= date_trunc('month', now())`, [user.id]),
    sql<{ key: boolean; playground: boolean; api: boolean }>(`select
      exists (select 1 from public.api_keys where user_id = $1) as key,
      exists (select 1 from public.usage_events e join public.api_keys k on k.id = e.key_id where e.user_id = $1 and k.is_service) as playground,
      exists (select 1 from public.usage_events e join public.api_keys k on k.id = e.key_id where e.user_id = $1 and not k.is_service) as api`, [user.id]),
    sql<Recent>(`select e.id::text, e.created_at, e.endpoint, e.status, e.latency_ms, k.name as key_name, k.is_service
      from public.usage_events e left join public.api_keys k on k.id = e.key_id where e.user_id = $1 order by e.created_at desc, e.id desc limit 6`, [user.id]),
  ]);
  const series: Point[] = buckets.map(b => ({ requests: b.requests, errors: b.errors, audioMin: Number(b.audio) / 60, chars: b.chars, latencyMs: b.latency === null ? null : Number(b.latency) }));
  const now = new Date(), next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const resets = new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(next);
  const first = (user.name ?? "").trim().split(/\s+/)[0] ?? "";
  return (
    <ConsoleShell lang={lang} page="overview" admin={profile.role === "admin"} user={user} access={profile.beta_status}
      title={done?.key || done?.api ? t.welcome(first) : t.h1(first)}>
      <Overview lang={lang} range={range} series={series} steps={[Boolean(done?.key), Boolean(done?.playground), Boolean(done?.api)]}
        notice={profile.beta_status === "approved" ? undefined : <AccountPaused lang={lang} />}
        usedMin={Number(month?.audio_seconds ?? 0) / 60} limitMin={profile.monthly_audio_seconds / 60} resets={resets} recent={recent} />
    </ConsoleShell>
  );
}
