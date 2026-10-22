import type { Metadata } from "next";
import { NotConfigured } from "@/components/account/AccountShell";
import { MODEL_ORB } from "@/components/console/colours";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { Filters } from "@/components/console/Filters";
import { LocalTime } from "@/components/console/LocalTime";
import { Icon } from "@/components/Icon";
import { consoleCopy } from "@/content/console";
import { isLang, lp, type Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { sql } from "@/lib/db";
import { hasAccounts } from "@/lib/env";
import { SCOPES, type Scope } from "@/lib/key-shape";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = consoleCopy[l].logs.meta;
  return { title, description, robots: { index: false } };
}

const RANGES = { "24h": "1 day", "7d": "7 days", "30d": "30 days" } as const;
type Range = keyof typeof RANGES;
const PAGE = 50;

type Row = { id: string; created_at: string; endpoint: Scope; status: number; audio_seconds: string; characters: number; latency_ms: number;
  key_name: string | null; prefix: string | null; is_service: boolean | null };

/* Logs, after platform.openai.com/logs: every request from this account, newest first, fifty at a time, filtered by
   period, model, outcome and key, all in the address. Only what the gateway meters is kept (usage_events): the
   endpoint, the status, durations and counts, never the audio or the text. */
export default async function Logs({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/account/logs");
  const t = consoleCopy[lang].logs, m = consoleCopy[lang].keys.models;
  const sp = await searchParams;
  const range: Range = sp.range && sp.range in RANGES ? sp.range as Range : "7d";
  const model = SCOPES.find(s => s === sp.model) ?? "";
  const status = sp.status === "ok" || sp.status === "errors" ? sp.status : "";
  const keys = await sql<{ id: string; name: string; prefix: string }>("select id, name, prefix from public.api_keys where user_id = $1 order by created_at desc", [user.id]);
  const key = sp.key === "playground" || keys.some(k => k.id === sp.key) ? sp.key! : "";
  const [beforeTs, beforeId] = (sp.before ?? "").split("_");
  const before = beforeTs && /^\d+$/.test(beforeId ?? "") && !Number.isNaN(Date.parse(beforeTs)) ? { ts: beforeTs, id: beforeId } : null;

  // Every condition is a bound parameter; the user id always comes first.
  const args: unknown[] = [user.id, RANGES[range]];
  const where = ["e.user_id = $1", "e.created_at >= now() - $2::interval"];
  if (model) { args.push(model); where.push(`e.endpoint = $${args.length}`); }
  if (status === "ok") where.push("e.status < 400");
  if (status === "errors") where.push("e.status >= 400");
  if (key === "playground") where.push("k.is_service");
  else if (key) { args.push(key); where.push(`e.key_id = $${args.length}`); }
  if (before) { args.push(before.ts, before.id); where.push(`(e.created_at, e.id) < ($${args.length - 1}::timestamptz, $${args.length}::bigint)`); }
  const rows = await sql<Row>(`select e.id::text, e.created_at, e.endpoint, e.status, e.audio_seconds, e.characters, e.latency_ms,
      k.name as key_name, k.prefix, k.is_service
    from public.usage_events e left join public.api_keys k on k.id = e.key_id
    where ${where.join(" and ")} order by e.created_at desc, e.id desc limit ${PAGE + 1}`, args);
  const more = rows.length > PAGE, page = rows.slice(0, PAGE);
  const last = page[page.length - 1];
  const keep = new URLSearchParams(Object.entries({ range: range === "7d" ? "" : range, model, status, key }).filter(([, v]) => v) as [string, string][]);
  const olderHref = last ? `?${new URLSearchParams([...keep, ["before", `${new Date(last.created_at).toISOString()}_${last.id}`]])}` : "";
  const nf = new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 1 });
  const keyLabel = (r: Row) => (r.is_service ? t.playground : r.key_name ?? t.deletedKey);

  return (
    <ConsoleShell lang={lang} page="logs" admin={profile.role === "admin"} user={user} access={profile.beta_status} title={consoleCopy[lang].nav.logs} lede={t.lede}>
      <Filters
        seg={{ name: "range", value: range === "7d" ? "" : range, label: t.th.time, options: (Object.keys(RANGES) as Range[]).map(r => ({ value: r === "7d" ? "" : r, label: t.range[r] })) }}
        selects={[
          { name: "model", value: model, label: t.th.model, options: [{ value: "", label: t.allModels }, ...SCOPES.map(s => ({ value: s, label: `${m[s].name} · ${m[s].task}` }))] },
          { name: "status", value: status, label: t.th.status, options: [{ value: "", label: t.status.all }, { value: "ok", label: t.status.ok }, { value: "errors", label: t.status.errors }] },
          { name: "key", value: key, label: t.th.key, options: [{ value: "", label: t.allKeys }, { value: "playground", label: t.playground }, ...keys.map(k => ({ value: k.id, label: `${k.name} (${k.prefix}…)` }))] },
        ]} />

      {page.length === 0 ? (
        <div className="cx-empty">
          <span className="cx-empty-ic"><Icon name="logs" size={24} stroke={1.5} /></span>
          <h2>{t.emptyH}</h2><p>{t.emptyBody}</p>
          <a className="cx-btn primary" href={lp(lang, "/account/playground")}>{t.emptyCta}</a>
        </div>
      ) : (
        <div className="cx-table-wrap">
          <table className="cx-table cx-logs stack">
            <thead><tr>
              <th>{t.th.time}</th><th>{t.th.model}</th><th>{t.th.key}</th><th>{t.th.status}</th>
              <th className="num">{t.th.audio}</th><th className="num">{t.th.chars}</th><th className="num">{t.th.latency}</th>
            </tr></thead>
            <tbody>{page.map(r => (
              <tr key={r.id}>
                <td className="cx-when" data-label={t.th.time}><LocalTime iso={new Date(r.created_at).toISOString()} lang={lang} /></td>
                <td className="c-main c-first"><i className="cx-dot" style={{ background: MODEL_ORB[r.endpoint] }} />{m[r.endpoint]?.name ?? r.endpoint}<code className="cx-ep">/v1/{r.endpoint}</code></td>
                <td data-label={t.th.key}>{keyLabel(r)}{r.prefix && !r.is_service && <code className="cx-ep">{r.prefix}…</code>}</td>
                <td className="c-corner"><span className={`cx-status s${String(r.status)[0]}`}>{r.status}</span></td>
                <td className="num" data-label={t.th.audio}>{Number(r.audio_seconds) ? `${nf.format(Number(r.audio_seconds))} s` : "–"}</td>
                <td className="num" data-label={t.th.chars}>{r.characters ? nf.format(r.characters) : "–"}</td>
                <td className="num" data-label={t.th.latency}>{nf.format(r.latency_ms / 1000)} s</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div className="cx-pager">
        {before && <a className="cx-btn" href={keep.size ? `?${keep}` : "?"}>{t.newest}</a>}
        {more && <a className="cx-btn" href={olderHref}>{t.older}<Icon name="arrow-long" size={15} stroke={1.6} /></a>}
      </div>
      <p className="cx-note">{t.privacy}</p>
    </ConsoleShell>
  );
}
