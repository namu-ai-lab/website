import type { Metadata } from "next";
import { NotConfigured } from "@/components/account/AccountShell";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { UsageView, type UsageDay, type UsageTotals } from "@/components/console/UsageView";
import { accountCopy } from "@/content/account";
import { consoleCopy } from "@/content/console";
import { isLang, type Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { sql } from "@/lib/db";
import { hasAccounts } from "@/lib/env";
import type { Scope } from "@/lib/key-shape";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = consoleCopy[l].usage.meta;
  return { title, description, robots: { index: false } };
}

export default async function Usage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/account/usage");
  // Since the first of the month (UTC), the same window the gateway's quota uses; only this user's rows.
  const totals = await sql<{ endpoint: Scope; requests: number; errors: number; audio_seconds: string; characters: number }>(`select endpoint, count(*)::int as requests,
      count(*) filter (where status >= 400)::int as errors, coalesce(sum(audio_seconds), 0) as audio_seconds, coalesce(sum(characters), 0)::int as characters
    from public.usage_events where user_id = $1 and created_at >= date_trunc('month', now()) group by endpoint`, [user.id]);
  const daily = await sql<UsageDay>(`select to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as day, endpoint, count(*)::int as requests
    from public.usage_events where user_id = $1 and created_at >= date_trunc('month', now()) group by 1, 2`, [user.id]);
  const month = new Date().toISOString().slice(0, 7);

  return (
    <ConsoleShell lang={lang} page="usage" admin={profile.role === "admin"} user={user} access={profile.beta_status}
      title={accountCopy[lang].usage.h1} lede={consoleCopy[lang].usage.lede}>
      <UsageView lang={lang} month={month} limitMin={profile.monthly_audio_seconds / 60} daily={daily}
        totals={totals.map(r => ({ endpoint: r.endpoint, requests: r.requests, errors: r.errors, audioMin: Number(r.audio_seconds) / 60, chars: r.characters } satisfies UsageTotals))} />
    </ConsoleShell>
  );
}
