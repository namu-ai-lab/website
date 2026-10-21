import type { Metadata } from "next";
import { NotConfigured } from "@/components/account/AccountShell";
import { AccountPaused } from "@/components/account/AccountPaused";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { Overview, type Recent } from "@/components/console/Overview";
import { Icon } from "@/components/Icon";
import { consoleCopy } from "@/content/console";
import { isLang, lp, type Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { sql } from "@/lib/db";
import { apiBase, hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = consoleCopy[l].overview.meta;
  return { title, description, robots: { index: false } };
}

/* The console's Home (components/console/Overview): first steps for a new developer, the month and the last thirty
   days for a returning one. Only this user's rows. */
export default async function Account({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/account");
  const t = consoleCopy[lang].overview;
  const [[month], [last30], [keys], recent] = await Promise.all([
    sql<{ audio_seconds: string; ever: boolean }>(`select coalesce(sum(audio_seconds) filter (where created_at >= date_trunc('month', now())), 0) as audio_seconds,
      count(*) > 0 as ever from public.usage_events where user_id = $1`, [user.id]),
    sql<{ requests: number; errors: number; latency: string | null }>(`select count(*)::int as requests, count(*) filter (where status >= 400)::int as errors,
      avg(latency_ms) filter (where status < 400) as latency from public.usage_events where user_id = $1 and created_at >= now() - interval '30 days'`, [user.id]),
    sql<{ n: number; ever: number }>(`select count(*) filter (where revoked_at is null)::int as n, count(*)::int as ever from public.api_keys where user_id = $1`, [user.id]),
    sql<Recent>(`select e.id::text, e.created_at, e.endpoint, e.status, e.latency_ms, k.name as key_name, k.is_service
      from public.usage_events e left join public.api_keys k on k.id = e.key_id where e.user_id = $1 order by e.created_at desc, e.id desc limit 6`, [user.id]),
  ]);
  const approved = profile.beta_status === "approved";
  const first = (user.name ?? "").trim().split(/\s+/)[0] ?? "";
  const firstRun = !month?.ever && !keys?.ever;
  const L = (p: string) => lp(lang, p);
  return (
    <ConsoleShell lang={lang} page="overview" admin={profile.role === "admin"} user={user} access={profile.beta_status}
      title={firstRun ? t.h1(first) : t.welcome(first)} lede={t.lede}
      actions={firstRun ? undefined : <>
        <a className="cx-btn" href={L("/account/playground")}><Icon name="waveform" size={16} stroke={1.6} />{t.playground}</a>
        <a className="cx-btn primary" href={`${L("/account/keys")}?create=1`}><Icon name="plus" size={16} stroke={1.8} />{t.newKey}</a>
      </>}>
      <Overview lang={lang} apiBase={apiBase} firstRun={firstRun} approved={approved}
        notice={approved ? undefined : <AccountPaused lang={lang} />}
        usedMin={Number(month?.audio_seconds ?? 0) / 60} limitMin={profile.monthly_audio_seconds / 60}
        requests={last30?.requests ?? 0} errors={last30?.errors ?? 0} latencyMs={last30?.latency ? Number(last30.latency) : null} recent={recent} />
    </ConsoleShell>
  );
}
