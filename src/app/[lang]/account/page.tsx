import type { Metadata } from "next";
import { NotConfigured } from "@/components/account/AccountShell";
import { AccountPaused } from "@/components/account/AccountPaused";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { Overview } from "@/components/console/Overview";
import { consoleCopy } from "@/content/console";
import { isLang, type Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { sql } from "@/lib/db";
import { apiBase, hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = consoleCopy[l].overview.meta;
  return { title, description, robots: { index: false } };
}

/* The console's home: the month at a glance, a first request, the models (components/console/Overview). */
export default async function Account({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/account");
  const t = consoleCopy[lang].overview;
  // This month (UTC), the window the gateway's quota uses; only this user's rows.
  const [usage] = await sql<{ requests: number; audio_seconds: string }>(`select count(*)::int as requests, coalesce(sum(audio_seconds), 0) as audio_seconds
    from public.usage_events where user_id = $1 and created_at >= date_trunc('month', now())`, [user.id]);
  const [keys] = await sql<{ n: number }>(`select count(*)::int as n from public.api_keys where user_id = $1 and revoked_at is null`, [user.id]);
  const approved = profile.beta_status === "approved";
  const first = (user.name ?? "").trim().split(/\s+/)[0] ?? "";

  return (
    <ConsoleShell lang={lang} page="overview" admin={profile.role === "admin"} user={user} access={profile.beta_status} title={t.h1(first)} lede={t.lede}>
      <Overview lang={lang} apiBase={apiBase} approved={approved} usedMin={Number(usage?.audio_seconds ?? 0) / 60} limitMin={profile.monthly_audio_seconds / 60}
        requests={usage?.requests ?? 0} activeKeys={keys?.n ?? 0}
        notice={approved ? undefined : <AccountPaused lang={lang} />} />
    </ConsoleShell>
  );
}
