/* The usage page's body, after platform.openai.com's: four figures for the month (audio against the allowance,
   requests, characters spoken, errors), requests per day stacked by model, and the month by endpoint. Plain markup
   and one SVG, drawn on the server from the month's usage events. */
import { consoleCopy } from "@/content/console";
import type { Lang } from "@/i18n/config";
import { SCOPES, type Scope } from "@/lib/key-shape";

export type UsageTotals = { endpoint: Scope; requests: number; errors: number; audioMin: number; chars: number };
export type UsageDay = { day: string; endpoint: Scope; requests: number };   // day as YYYY-MM-DD (UTC)

/* one colour per model, from Namu's palette */
const COLOUR: Record<Scope, string> = { speech: "#e8935a", transcribe: "#6b3e1e", translate: "#c9a27e", converse: "#1c1410" };

export function UsageView({ lang, totals, daily, limitMin, month }: { lang: Lang; totals: UsageTotals[]; daily: UsageDay[]; limitMin: number; month: string }) {
  const t = consoleCopy[lang].usage, m = consoleCopy[lang].keys.models;
  const nf = new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 1 });
  const rows = SCOPES.map(ep => totals.find(x => x.endpoint === ep) ?? { endpoint: ep, requests: 0, errors: 0, audioMin: 0, chars: 0 });
  const sum = (k: "requests" | "errors" | "audioMin" | "chars") => rows.reduce((s, r) => s + r[k], 0);
  const used = sum("audioMin"), requests = sum("requests"), errors = sum("errors");
  const pct = limitMin > 0 ? Math.min(100, (used / limitMin) * 100) : 0;

  /* the month's days, each a stack of its models' requests */
  const [y, mo] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const stack = Array.from({ length: days }, (_, i) => {
    const d = `${month}-${String(i + 1).padStart(2, "0")}`;
    return SCOPES.map(ep => daily.find(x => x.day === d && x.endpoint === ep)?.requests ?? 0);
  });
  const peak = Math.max(1, ...stack.map(s => s.reduce((a, b) => a + b, 0)));
  const top = (() => { const p = 10 ** Math.floor(Math.log10(peak)); return Math.ceil(peak / p) * p; })();
  const W = 720, H = 210, padL = 34, padT = 10, padB = 22, bw = (W - padL) / days;
  const yOf = (v: number) => padT + (H - padB - padT) * (1 - v / top);

  return (
    <>
      <div className="cx-tiles">
        <div className="cx-tile">
          <p>{t.tiles.audio}</p>
          <strong>{nf.format(used)}<small> min</small></strong>
          <span className="cx-muted">{t.of(nf.format(limitMin))}</span>
          <div className="cx-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={t.tiles.audio}><i style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="cx-tile"><p>{t.tiles.requests}</p><strong>{nf.format(requests)}</strong></div>
        <div className="cx-tile"><p>{t.tiles.chars}</p><strong>{nf.format(sum("chars"))}</strong></div>
        <div className="cx-tile"><p>{t.tiles.errors}</p><strong>{nf.format(errors)}</strong>{requests > 0 && <span className="cx-muted">{nf.format((errors / requests) * 100)}%</span>}</div>
      </div>

      <div className="cx-card">
        <div className="cx-card-head">
          <h2>{t.perDay}</h2>
          <ul className="cx-legend">{SCOPES.map(ep => <li key={ep}><i style={{ background: COLOUR[ep] }} />{m[ep].name}</li>)}</ul>
        </div>
        {requests === 0 ? <p className="cx-muted cx-chart-empty">{t.empty}</p> : (
          <svg className="cx-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${t.perDay}: ${nf.format(requests)}`}>
            {[0, 0.5, 1].map(f => (
              <g key={f}><line x1={padL} x2={W} y1={yOf(top * f)} y2={yOf(top * f)} className="grid" /><text x={padL - 8} y={yOf(top * f) + 4} textAnchor="end">{nf.format(top * f)}</text></g>
            ))}
            {stack.map((s, i) => {
              let acc = 0;
              return (
                <g key={i}>
                  {s.map((v, k) => {
                    if (!v) return null;
                    const y0 = yOf(acc), y1 = yOf(acc + v); acc += v;
                    return <rect key={k} x={padL + i * bw + bw * 0.18} y={y1} width={bw * 0.64} height={Math.max(1, y0 - y1)} rx={2} fill={COLOUR[SCOPES[k]]}><title>{`${i + 1}: ${m[SCOPES[k]].name} ${v}`}</title></rect>;
                  })}
                  {(i === 0 || (i + 1) % 5 === 0) && <text x={padL + i * bw + bw / 2} y={H - 6} textAnchor="middle">{i + 1}</text>}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <div className="cx-card">
        <div className="cx-card-head"><h2>{t.byEndpoint}</h2></div>
        <div className="cx-table-wrap flat">
          <table className="cx-table">
            <thead><tr><th>{t.th.endpoint}</th><th>{t.th.model}</th><th className="num">{t.th.requests}</th><th className="num">{t.th.audio}</th><th className="num">{t.th.chars}</th><th className="num">{t.th.errors}</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.endpoint} className={r.requests ? undefined : "off"}>
                <td><code>/v1/{r.endpoint}</code></td><td><i className="cx-dot" style={{ background: COLOUR[r.endpoint] }} />{m[r.endpoint].name}</td>
                <td className="num">{nf.format(r.requests)}</td><td className="num">{nf.format(r.audioMin)}</td><td className="num">{nf.format(r.chars)}</td><td className="num">{nf.format(r.errors)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <p className="cx-note">{t.note}</p>
    </>
  );
}
