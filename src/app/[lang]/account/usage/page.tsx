import type { Metadata } from "next";
import { NotConfigured } from "@/components/account/AccountShell";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { Filters } from "@/components/console/Filters";
import { UsageView } from "@/components/console/UsageView";
import { Icon } from "@/components/Icon";
import { accountCopy } from "@/content/account";
import { consoleCopy } from "@/content/console";
import { isLang, type Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { hasAccounts } from "@/lib/env";
import { RANGES, usageFor, type Range } from "@/lib/usage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = consoleCopy[l].usage.meta;
  return { title, description, robots: { index: false } };
}

/* Usage, after platform.openai.com/usage: a period (this month by default), grouped by model or by key, with a CSV
   export of the same numbers. Only this user's rows (lib/usage). */
export default async function Usage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ range?: string; by?: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/account/usage");
  const t = consoleCopy[lang].usage, sp = await searchParams;
  const range: Range = RANGES.find(r => r === sp.range) ?? "month";
  const by = sp.by === "key" ? "key" : "model";
  const data = await usageFor(user.id, range, by, { playground: t.playground, deleted: t.deleted });
  const q = new URLSearchParams({ range, by, lang });
  return (
    <ConsoleShell lang={lang} page="usage" admin={profile.role === "admin"} user={user} access={profile.beta_status}
      title={accountCopy[lang].usage.h1} lede={t.lede}
      actions={<a className="cx-btn" href={`/api/usage/export?${q}`} download><Icon name="download" size={16} stroke={1.6} />{t.export}</a>}>
      <Filters
        seg={{ name: "range", value: range === "month" ? "" : range, label: t.period, options: RANGES.map(r => ({ value: r === "month" ? "" : r, label: t.range[r] })) }}
        selects={[{ name: "by", value: by === "model" ? "" : by, label: t.groupBy, options: [{ value: "", label: t.by.model }, { value: "key", label: t.by.key }] }]} />
      <UsageView lang={lang} data={data} by={by} monthLimitMin={range === "month" ? profile.monthly_audio_seconds / 60 : null} />
    </ConsoleShell>
  );
}
