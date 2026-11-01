/* The console's Home, after platform.openai.com's: Get started (create a key, try the models, make a first request,
   each ticked once done) beside the home page's haze and the Namu ring, with two shortcuts on glass; then the chosen
   period's figures, each with its line (requests, audio, success rate, latency, characters), and the free allowance
   where OpenAI shows credits; then the latest requests and the models. Drawn on the server. */
import type { ReactNode } from "react";
import { HeroRing } from "../Art";
import { Icon } from "../Icon";
import { MODEL_ORB } from "./colours";
import { Filters } from "./Filters";
import { LocalTime } from "./LocalTime";
import { consoleCopy } from "@/content/console";
import { lp, type Lang } from "@/i18n/config";
import { numberFormat } from "@/i18n/format";
import type { IconName } from "@/lib/icons";
import { SCOPES, type Scope } from "@/lib/key-shape";

export type Recent = { id: string; created_at: Date; endpoint: Scope; status: number; latency_ms: number; key_name: string | null; is_service: boolean | null };
export type Point = { requests: number; errors: number; audioMin: number; chars: number; latencyMs: number | null };
export type HomeRange = "24h" | "7d" | "14d" | "30d";
const PATH: Record<Scope, string> = { transcribe: "/v1/transcribe", speech: "/v1/speech", translate: "/v1/translate", converse: "/v1/converse" };

/* a figure's line over the period: the values joined, a faint fill under them, the last point marked */
function Spark({ values, colour }: { values: (number | null)[]; colour: string }) {
  const W = 300, H = 46, pad = 4;
  const known = values.map((v, i) => [i, v] as const).filter((x): x is readonly [number, number] => x[1] !== null);
  const top = Math.max(1e-9, ...known.map(([, v]) => v));
  const x = (i: number) => pad + (i / Math.max(1, values.length - 1)) * (W - 2 * pad);
  const y = (v: number) => H - pad - (v / top) * (H - 2 * pad - 4);
  const pts = known.map(([i, v]) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const last = known[known.length - 1];
  return (
    <svg className="cx-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <line className="base" x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} />
      {pts.length > 1 && <>
        <polygon className="area" fill={colour} points={`${x(known[0][0])},${H - pad} ${pts.join(" ")} ${x(last[0])},${H - pad}`} />
        <polyline className="ln" stroke={colour} points={pts.join(" ")} vectorEffect="non-scaling-stroke" />
      </>}
      {last && <circle className="end" cx={x(last[0])} cy={y(last[1])} r={3.6} fill={colour} vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

export function Overview({ lang, range, series, steps, notice, usedMin, limitMin, resets, recent }:
  { lang: Lang; range: HomeRange; series: Point[]; steps: [boolean, boolean, boolean]; notice?: ReactNode;
    usedMin: number; limitMin: number; resets: string; recent: Recent[] }) {
  const t = consoleCopy[lang].overview, m = consoleCopy[lang].keys.models, L = (p: string) => lp(lang, p);
  const nf = numberFormat(lang);
  const sum = (k: "requests" | "errors" | "audioMin" | "chars") => series.reduce((s, p) => s + p[k], 0);
  const requests = sum("requests"), errors = sum("errors");
  const ok = series.reduce((s, p) => s + (p.latencyMs === null ? 0 : p.requests - p.errors), 0);
  const latency = ok ? series.reduce((s, p) => s + (p.latencyMs ?? 0) * (p.requests - p.errors), 0) / ok : null;
  const pct = limitMin > 0 ? Math.min(100, (usedMin / limitMin) * 100) : 0;
  const icons: IconName[] = ["key", "waveform", "code"], hrefs = [`${L("/account/keys")}?create=1`, L("/account/playground"), L("/docs")];
  const usage = L(`/account/usage${range === "24h" || range === "7d" ? "?range=7d" : "?range=30d"}`);
  const cell = (label: string, value: ReactNode, line: ReactNode) => (
    <a className="cx-metric" href={usage}><p>{label}<Icon name="chevron" size={14} stroke={1.6} className="rot-90" /></p><strong>{value}</strong>{line}</a>
  );

  return (
    <>
      {notice}
      <section aria-labelledby="get-started-h">
        <div className="cx-get-h"><h2 id="get-started-h">{t.getStarted}</h2></div>
        <div className="cx-get">
          <ol className="cx-get-steps">
            {t.steps.map(([title, sub], i) => (
              <li key={title} className={steps[i] ? "done" : undefined}>
                <a href={hrefs[i]}>
                  <span className="cx-get-ic"><Icon name={steps[i] ? "check" : icons[i]} size={19} stroke={1.5} /></span>
                  <span><strong>{i + 1}. {title}</strong><em>{sub}</em></span>
                  <Icon name="arrow-long" size={16} stroke={1.5} />
                </a>
              </li>
            ))}
          </ol>
          <div className="cx-get-art">
            <div className="pg-haze" aria-hidden="true"><i className="b1" /><i className="b2" /><i className="b3" /><span className="grain" /></div>
            <HeroRing id="cx-ring" />
            {/* HA-REVIEW: everyday greetings, as the home page's examples use them */}
            <p className="cx-get-words" aria-hidden="true" lang="ha"><span>Sannu da zuwa</span><span>Barka da safiya</span><span>Ina kwana?</span></p>
            <a className="cx-get-cta" href={L("/docs")}><strong>{t.quick[0]}<Icon name="external" size={14} stroke={1.6} /></strong><em>{t.quick[1]}</em></a>
            <a className="cx-get-cta" href={L("/account/playground")}><strong>{t.pg[0]}<Icon name="arrow-long" size={14} stroke={1.6} /></strong><em>{t.pg[1]}</em></a>
          </div>
        </div>
      </section>

      <div className="cx-range-row">
        <h2>{consoleCopy[lang].nav.usage}</h2>
        <Filters seg={{ name: "range", value: range === "7d" ? "" : range, label: t.period,
          options: (["24h", "7d", "14d", "30d"] as HomeRange[]).map(r => ({ value: r === "7d" ? "" : r, label: t.ranges[r] })) }} />
      </div>
      <div className="cx-metrics">
        {cell(t.m.requests, nf.format(requests), <Spark values={series.map(p => p.requests)} colour="#e8935a" />)}
        {cell(t.m.audio, <>{nf.format(sum("audioMin"))}<small> min</small></>, <Spark values={series.map(p => p.audioMin)} colour="#b4552a" />)}
        {cell(t.m.success, requests ? `${nf.format(((requests - errors) / requests) * 100)}%` : "–",
          <Spark values={series.map(p => (p.requests ? ((p.requests - p.errors) / p.requests) * 100 : null))} colour="#7a4325" />)}
        <div className="cx-metric allow">
          <p>{t.m.allowance}</p>
          <strong>{t.left(nf.format(Math.max(0, limitMin - usedMin)))}</strong>
          <span className="cx-small">{t.ofMonth(nf.format(limitMin), resets)}</span>
          <div className="cx-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={t.m.allowance}><i style={{ width: `${pct}%` }} /></div>
          <a className="cx-btn" href={L("/account/limits")}>{t.more}</a>
        </div>
        {cell(t.m.latency, latency !== null ? <>{nf.format(latency / 1000)}<small> s</small></> : "–", <Spark values={series.map(p => p.latencyMs)} colour="#c9a27e" />)}
        {cell(t.m.chars, nf.format(sum("chars")), <Spark values={series.map(p => p.chars)} colour="#d98e7a" />)}
      </div>

      <div className="cx-home">
        <div className="cx-card cx-recent">
          <div className="cx-card-head"><h2>{t.recentH}</h2><a className="cx-more" href={L("/account/logs")}>{t.recentAll}<Icon name="arrow-long" size={15} stroke={1.6} /></a></div>
          {recent.length === 0 ? <p className="cx-muted">{t.recentEmpty}</p> : (
            <ul>{recent.map(r => (
              <li key={r.id}>
                <span className={`cx-status s${String(r.status)[0]}`}>{r.status}</span>
                <span className="cx-recent-what"><i className="cx-dot" style={{ background: MODEL_ORB[r.endpoint] }} />{m[r.endpoint]?.name ?? r.endpoint}
                  <em>{r.is_service ? t.playgroundKey : r.key_name ?? "–"}</em></span>
                <span className="cx-muted cx-small">{nf.format(r.latency_ms / 1000)} s</span>
                <span className="cx-muted cx-small cx-recent-when"><LocalTime iso={r.created_at.toISOString()} lang={lang} rel /></span>
              </li>
            ))}</ul>
          )}
        </div>
        <div className="cx-card cx-try">
          <div className="cx-card-head"><div><h2>{t.tryH}</h2><p className="cx-muted">{t.tryLede}</p></div></div>
          <ul>{SCOPES.map(s => (
            <li key={s}>
              <a href={L(`/account/playground?model=${s}`)}>
                <i style={{ background: MODEL_ORB[s] }} aria-hidden="true" />
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
