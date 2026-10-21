/* The console's Home, after platform.openai.com: a new developer gets the first-call steps (FirstKey); a returning one
   gets the month's audio against the allowance, the last thirty days (requests, success rate, latency, as on
   ElevenLabs' analytics), their latest requests and the models one click from the Playground. A paused account sees
   why first. */
import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { MODEL_COLOUR } from "./colours";
import { FirstKey } from "./FirstKey";
import { LocalTime } from "./LocalTime";
import { consoleCopy } from "@/content/console";
import { lp, type Lang } from "@/i18n/config";
import { SCOPES, type Scope } from "@/lib/key-shape";

export type Recent = { id: string; created_at: string; endpoint: Scope; status: number; latency_ms: number; key_name: string | null; is_service: boolean | null };
const PATH: Record<Scope, string> = { transcribe: "/v1/transcribe", speech: "/v1/speech", translate: "/v1/translate", converse: "/v1/converse" };

export function Overview({ lang, apiBase, firstRun, approved, notice, usedMin, limitMin, requests, errors, latencyMs, recent }:
  { lang: Lang; apiBase: string; firstRun: boolean; approved: boolean; notice?: ReactNode; usedMin: number; limitMin: number;
    requests: number; errors: number; latencyMs: number | null; recent: Recent[] }) {
  const t = consoleCopy[lang].overview, m = consoleCopy[lang].keys.models, L = (p: string) => lp(lang, p);
  const nf = new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 1 });
  const pct = limitMin > 0 ? Math.min(100, (usedMin / limitMin) * 100) : 0;
  if (notice) return <>{notice}</>;
  if (firstRun && approved) return <FirstKey lang={lang} apiBase={apiBase} />;
  return (
    <>
      <div className="cx-tiles">
        <div className="cx-tile">
          <p>{t.audio}</p><strong>{t.minutes(nf.format(usedMin), nf.format(limitMin))}</strong>
          <div className="cx-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={t.audio}><i style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="cx-tile"><p>{t.requests30}</p><strong>{nf.format(requests)}</strong><span className="cx-muted">{t.last30}</span></div>
        <div className="cx-tile"><p>{t.success}</p><strong>{requests ? `${nf.format(((requests - errors) / requests) * 100)}%` : "–"}</strong><span className="cx-muted">{t.last30}</span></div>
        <div className="cx-tile"><p>{t.latency}</p><strong>{latencyMs !== null ? <>{nf.format(latencyMs / 1000)}<small> s</small></> : "–"}</strong><span className="cx-muted">{t.last30}</span></div>
      </div>

      <div className="cx-home">
        <div className="cx-card cx-recent">
          <div className="cx-card-head"><h2>{t.recentH}</h2><a className="cx-more" href={L("/account/logs")}>{t.recentAll}<Icon name="arrow-long" size={15} stroke={1.6} /></a></div>
          {recent.length === 0 ? <p className="cx-muted">{t.recentEmpty}</p> : (
            <ul>{recent.map(r => (
              <li key={r.id}>
                <span className={`cx-status s${String(r.status)[0]}`}>{r.status}</span>
                <span className="cx-recent-what"><i className="cx-dot" style={{ background: MODEL_COLOUR[r.endpoint] }} />{m[r.endpoint]?.name ?? r.endpoint}
                  <em>{r.is_service ? t.playgroundKey : r.key_name ?? "–"}</em></span>
                <span className="cx-muted cx-small">{nf.format(r.latency_ms / 1000)} s</span>
                <span className="cx-muted cx-small cx-recent-when"><LocalTime iso={new Date(r.created_at).toISOString()} lang={lang} rel /></span>
              </li>
            ))}</ul>
          )}
        </div>

        <div className="cx-card cx-try">
          <div className="cx-card-head"><div><h2>{t.tryH}</h2><p className="cx-muted">{t.tryLede}</p></div></div>
          <ul>{SCOPES.map(s => (
            <li key={s}>
              <a href={L(`/account/playground?model=${s}`)}>
                <i style={{ background: MODEL_COLOUR[s] }} aria-hidden="true" />
                <span><strong>{m[s].name}</strong><em>{m[s].task}</em></span>
                <code>{PATH[s]}</code>
                <Icon name="arrow-long" size={15} stroke={1.6} />
              </a>
            </li>
          ))}</ul>
        </div>
      </div>
    </>
  );
}
