/* The Usage page's body, after platform.openai.com/usage and ElevenLabs' analytics: four figures for the period
   (audio, against the allowance this month; requests; success rate; average latency), requests per day stacked by
   model or by key, and the period by model or by key. Plain markup and one SVG, drawn on the server. */
import { MODEL_COLOUR } from "./colours";
import { consoleCopy } from "@/content/console";
import type { Lang } from "@/i18n/config";
import { formatDate, numberFormat } from "@/i18n/format";
import type { UsageData } from "@/lib/usage";

/* keys take Namu's palette in turn; the Playground is always ink, a deleted key always grey */
const KEY_COLOURS = ["#e8935a", "#6b3e1e", "#c9a27e", "#b4552a", "#8a6a52", "#e7c39e", "#3a2a20", "#d8a37a", "#5a4e46", "#f0b98c"];

export function UsageView({ lang, data, by, monthLimitMin }: { lang: Lang; data: UsageData; by: "model" | "key"; monthLimitMin: number | null }) {
  const t = consoleCopy[lang].usage, m = consoleCopy[lang].keys.models;
  const nf = numberFormat(lang);
  const colour = (id: string, i: number) => by === "model" ? MODEL_COLOUR[id as keyof typeof MODEL_COLOUR]
    : id === "playground" ? "#1c1410" : id === "deleted" ? "#b8b0a8" : KEY_COLOURS[i % KEY_COLOURS.length];
  const label = (g: UsageData["groups"][number]) => (g.scope ? m[g.scope].name : g.label);
  const groups = data.groups.map((g, i) => ({ ...g, name: label(g), colour: colour(g.id, i) }));
  const row = (id: string) => data.totals.find(x => x.group === id);
  const sum = (k: "requests" | "errors" | "audioMin" | "chars") => data.totals.reduce((s, r) => s + r[k], 0);
  const requests = sum("requests"), errors = sum("errors"), audio = sum("audioMin");
  const okRows = data.totals.filter(r => r.latencyMs !== null);
  const okCount = okRows.reduce((s, r) => s + (r.requests - r.errors), 0);
  const latency = okCount ? okRows.reduce((s, r) => s + (r.latencyMs ?? 0) * (r.requests - r.errors), 0) / okCount : null;
  const pct = monthLimitMin ? Math.min(100, (audio / monthLimitMin) * 100) : 0;

  /* each day a stack of its groups' requests */
  const stack = data.days.map(d => groups.map(g => data.daily.find(x => x.day === d && x.group === g.id)?.requests ?? 0));
  const peak = Math.max(1, ...stack.map(s => s.reduce((a, b) => a + b, 0)));
  const top = (() => { const p = 10 ** Math.floor(Math.log10(peak)); return Math.ceil(peak / p) * p; })();
  const W = 720, H = 210, padL = 34, padT = 10, padB = 22, bw = (W - padL) / Math.max(1, data.days.length);
  const yOf = (v: number) => padT + (H - padB - padT) * (1 - v / top);
  const every = data.days.length <= 8 ? 1 : 5;
  const dayLabel = (iso: string) => data.days.length <= 8
    ? formatDate(lang, `${iso}T00:00:00Z`, { style: "weekday" })
    : String(Number(iso.slice(8)));

  return (
    <>
      <div className="cx-tiles">
        <div className="cx-tile">
          <p>{t.tiles.audio}</p>
          <strong>{nf.format(audio)}<small> min</small></strong>
          {monthLimitMin !== null && <>
            <span className="cx-muted">{t.of(nf.format(monthLimitMin))}</span>
            <div className="cx-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={t.tiles.audio}><i style={{ width: `${pct}%` }} /></div>
          </>}
        </div>
        <div className="cx-tile"><p>{t.tiles.requests}</p><strong>{nf.format(requests)}</strong>{errors > 0 && <span className="cx-muted">{nf.format(errors)} {t.tiles.errors.toLowerCase()}</span>}</div>
        <div className="cx-tile"><p>{t.success}</p><strong>{requests ? `${nf.format(((requests - errors) / requests) * 100)}%` : "–"}</strong></div>
        <div className="cx-tile"><p>{t.latency}</p><strong>{latency !== null ? <>{nf.format(latency / 1000)}<small> s</small></> : "–"}</strong></div>
      </div>

      <div className="cx-card">
        <div className="cx-card-head">
          <h2>{t.perDay}</h2>
          <ul className="cx-legend">{groups.map(g => <li key={g.id}><i style={{ background: g.colour }} />{g.name}</li>)}</ul>
        </div>
        {requests === 0 ? <p className="cx-muted cx-chart-empty">{t.emptyRange}</p> : (
          <div className="cx-chart-scroll"><svg className="cx-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${t.perDay}: ${nf.format(requests)}`}>
            {[0, 0.5, 1].map(f => (
              <g key={f}><line x1={padL} x2={W} y1={yOf(top * f)} y2={yOf(top * f)} className="grid" /><text x={padL - 8} y={yOf(top * f) + 4} textAnchor="end">{nf.format(top * f)}</text></g>
            ))}
            {stack.map((s, i) => {
              let acc = 0;
              return (
                <g key={data.days[i]}>
                  {s.map((v, k) => {
                    if (!v) return null;
                    const y0 = yOf(acc), y1 = yOf(acc + v); acc += v;
                    return <rect key={k} x={padL + i * bw + bw * 0.18} y={y1} width={bw * 0.64} height={Math.max(1, y0 - y1)} rx={2} fill={groups[k].colour}><title>{`${data.days[i]} · ${groups[k].name}: ${v}`}</title></rect>;
                  })}
                  {(i === 0 || (i + 1) % every === 0) && <text x={padL + i * bw + bw / 2} y={H - 6} textAnchor="middle">{dayLabel(data.days[i])}</text>}
                </g>
              );
            })}
          </svg></div>
        )}
      </div>

      <div className="cx-card">
        <div className="cx-card-head"><h2>{by === "model" ? t.byModel : t.byKey}</h2></div>
        <div className="cx-table-wrap flat">
          <table className="cx-table stack">
            <thead><tr>
              <th>{by === "model" ? t.th.model : t.key}</th>{by === "model" && <th>{t.th.endpoint}</th>}
              <th className="num">{t.th.requests}</th><th className="num">{t.success}</th><th className="num">{t.th.audio}</th><th className="num">{t.th.chars}</th><th className="num">{t.latency}</th>
            </tr></thead>
            <tbody>{groups.map(g => {
              const r = row(g.id);
              return (
                <tr key={g.id} className={r?.requests ? undefined : "off"}>
                  <td className="c-main"><i className="cx-dot" style={{ background: g.colour }} />{g.name}</td>
                  {by === "model" && <td className="c-corner"><code>/v1/{g.id}</code></td>}
                  <td className="num" data-label={t.th.requests}>{nf.format(r?.requests ?? 0)}</td>
                  <td className="num" data-label={t.success}>{r?.requests ? `${nf.format(((r.requests - r.errors) / r.requests) * 100)}%` : "–"}</td>
                  <td className="num" data-label={t.th.audio}>{nf.format(r?.audioMin ?? 0)}</td>
                  <td className="num" data-label={t.th.chars}>{nf.format(r?.chars ?? 0)}</td>
                  <td className="num" data-label={t.latency}>{r?.latencyMs != null ? `${nf.format(r.latencyMs / 1000)} s` : "–"}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}
