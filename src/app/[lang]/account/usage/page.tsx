import type { Metadata } from "next";
import { AccountShell, NotConfigured } from "@/components/account/AccountShell";
import { accountCopy } from "@/content/account";
import { isLang, type Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { sql } from "@/lib/db";
import { hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = accountCopy[l].usage.meta;
  return { title, description, robots: { index: false } };
}

type Event = { endpoint: string; requests: number; errors: number; audio_seconds: string; characters: number };
const ENDPOINTS = ["transcribe", "speech", "translate", "converse"];

export default async function Usage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/account/usage");
  const t = accountCopy[lang].usage;

  // Totals since the first of the month (UTC), the same window the gateway's quota uses.
  const totals = await sql<Event>(`select endpoint, count(*)::int as requests, count(*) filter (where status >= 400)::int as errors,
      coalesce(sum(audio_seconds), 0) as audio_seconds, coalesce(sum(characters), 0)::int as characters
    from public.usage_events where user_id = $1 and created_at >= date_trunc('month', now()) group by endpoint`, [user.id]);
  const rows = ENDPOINTS.map(ep => {
    const t = totals.find(x => x.endpoint === ep);
    return { ep, requests: t?.requests ?? 0, errors: t?.errors ?? 0, audio: Number(t?.audio_seconds ?? 0) / 60, chars: t?.characters ?? 0 };
  });
  const used = rows.reduce((s, r) => s + r.audio, 0);
  const nf = new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 1 });
  const limit = profile.monthly_audio_seconds / 60;
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <AccountShell lang={lang} active="usage" admin={profile.role === "admin"} h1={t.h1} lede={t.lede}>
      <div className="panel acct-card">
        <p className="eyebrow">{t.month}</p>
        <p className="h3">{t.allowance(nf.format(used), nf.format(limit))}</p>
        <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}><i style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="acct-table-wrap">
        <table className="acct-table">
          <thead><tr><th>{t.th.endpoint}</th><th>{t.th.requests}</th><th>{t.th.audio}</th><th>{t.th.chars}</th><th>{t.th.errors}</th></tr></thead>
          <tbody>
            {rows.every(r => r.requests === 0) && <tr><td colSpan={5} className="muted">{t.empty}</td></tr>}
            {rows.filter(r => r.requests > 0).map(r => (
              <tr key={r.ep}><td><code>/v1/{r.ep}</code></td><td>{r.requests}</td><td>{nf.format(r.audio)}</td><td>{r.chars}</td><td>{r.errors}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="meta">{t.note}</p>
    </AccountShell>
  );
}
