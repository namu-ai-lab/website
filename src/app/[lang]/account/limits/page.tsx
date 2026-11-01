import type { Metadata } from "next";
import { NotConfigured } from "@/components/account/AccountShell";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { consoleCopy } from "@/content/console";
import { isLang, type Lang } from "@/i18n/config";
import { formatDate, numberFormat } from "@/i18n/format";
import { requireAccount } from "@/lib/account";
import { sql } from "@/lib/db";
import { hasAccounts } from "@/lib/env";
import { MAX_ACTIVE_KEYS } from "@/lib/key-shape";
import { LIMITS } from "@/lib/limits";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = consoleCopy[l].limits.meta;
  return { title, description, robots: { index: false } };
}

/* Limits, after platform.openai.com/settings/organization/limits: the month's audio allowance, the rate limit of each
   active key and of the Playground, the request limits, and what the API answers at each. Numbers come from the
   account and from lib/limits (which mirrors the gateway). */
export default async function Limits({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/account/limits");
  const t = consoleCopy[lang].limits;
  const nf = numberFormat(lang);
  const [usage] = await sql<{ audio_seconds: string }>(`select coalesce(sum(audio_seconds), 0) as audio_seconds from public.usage_events
    where user_id = $1 and created_at >= date_trunc('month', now())`, [user.id]);
  const keys = await sql<{ name: string; prefix: string; rate_limit_per_min: number }>(`select name, prefix, rate_limit_per_min from public.api_keys
    where user_id = $1 and revoked_at is null order by created_at`, [user.id]);
  const usedMin = Number(usage?.audio_seconds ?? 0) / 60, limitMin = profile.monthly_audio_seconds / 60;
  const pct = limitMin > 0 ? Math.min(100, (usedMin / limitMin) * 100) : 0;
  const now = new Date(), next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const resets = formatDate(lang, next, { style: "dayMonth" });

  return (
    <ConsoleShell lang={lang} page="limits" admin={profile.role === "admin"} user={user} access={profile.beta_status} title={consoleCopy[lang].nav.limits} lede={t.lede}>
      <div className="cx-card cx-allowance">
        <div className="cx-card-head"><div><h2>{t.allowanceH}</h2><p className="cx-muted">{t.allowanceLede}</p></div>
          <a className="cx-btn" href="mailto:contact@namuai.org?subject=Namu%20API%20allowance">{t.more}</a></div>
        <p className="cx-allowance-fig"><strong>{nf.format(usedMin)}</strong><span>/ {nf.format(limitMin)} min</span></p>
        <div className="cx-meter lg" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={t.allowanceH}><i style={{ width: `${pct}%` }} /></div>
        <p className="cx-allowance-foot"><span>{t.used(nf.format(usedMin), nf.format(limitMin))}</span><span>{t.resets(resets)}</span></p>
      </div>

      <div className="cx-card">
        <div className="cx-card-head"><div><h2>{t.rateH}</h2><p className="cx-muted">{t.rateLede}</p></div></div>
        <div className="cx-table-wrap flat">
          <table className="cx-table fit">
            <thead><tr><th>{t.th.what}</th><th className="num">{t.th.limit}</th></tr></thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.prefix}><td><span className="cx-name">{k.name}</span> <code className="cx-secret">{k.prefix}…</code></td><td className="num">{t.perMin(k.rate_limit_per_min)}</td></tr>
              ))}
              {keys.length === 0 && <tr className="off"><td colSpan={2}>{t.noKeys}</td></tr>}
              <tr><td><span className="cx-name">{t.playground}</span></td><td className="num">{t.perMin(LIMITS.playgroundPerMin)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="cx-card">
        <div className="cx-card-head"><div><h2>{t.requestH}</h2><p className="cx-muted">{t.requestLede}</p></div></div>
        <div className="cx-table-wrap flat">
          <table className="cx-table fit">
            <tbody>
              <tr><td>{t.upload}</td><td className="num">{t.mb(LIMITS.uploadMb)}</td></tr>
              <tr><td>{t.audio}</td><td className="num">{t.minutes(LIMITS.audioMinutes)}</td></tr>
              <tr><td>{t.text}</td><td className="num">{t.chars(nf.format(LIMITS.textChars))}</td></tr>
              <tr><td>{t.keys}</td><td className="num">{MAX_ACTIVE_KEYS}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="cx-card">
        <div className="cx-card-head"><div><h2>{t.errorsH}</h2><p className="cx-muted">{t.errorsLede}</p></div></div>
        <div className="cx-table-wrap flat">
          <table className="cx-table cx-errors stack">
            <thead><tr><th>{t.eth.status}</th><th>{t.eth.code}</th><th>{t.eth.meaning}</th></tr></thead>
            <tbody>{t.errors.map(([st, code, what]) => (
              <tr key={code}><td className="c-corner"><span className={`cx-status s${st[0]}`}>{st}</span></td><td className="c-main"><code>{code}</code></td><td className="wrap c-wide">{what}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </ConsoleShell>
  );
}
