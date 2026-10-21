/* The console's first page, after platform.openai.com's home: the month at a glance, three steps to a first request
   (with real code against the real base URL), and the four models as endpoints. A paused account sees why first. */
import type { ReactNode } from "react";
import { CodeTabs } from "../CodeTabs";
import { Icon } from "../Icon";
import { consoleCopy } from "@/content/console";
import { samples } from "@/content/docs";
import { lp, type Lang } from "@/i18n/config";
import { MAX_ACTIVE_KEYS, SCOPES } from "@/lib/key-shape";

const ENDPOINT = { transcribe: "/v1/transcribe", speech: "/v1/speech", translate: "/v1/translate", converse: "/v1/converse" } as const;

export function Overview({ lang, apiBase, usedMin, limitMin, requests, activeKeys, approved, notice }:
  { lang: Lang; apiBase: string; usedMin: number; limitMin: number; requests: number; activeKeys: number; approved: boolean; notice?: ReactNode }) {
  const t = consoleCopy[lang].overview, m = consoleCopy[lang].keys.models, L = (p: string) => lp(lang, p);
  const nf = new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", { maximumFractionDigits: 1 });
  const pct = limitMin > 0 ? Math.min(100, (usedMin / limitMin) * 100) : 0;
  const code = samples(apiBase).speech;
  return (
    <>
      {notice}
      <div className="cx-tiles three">
        <div className="cx-tile">
          <p>{t.audio}</p><strong>{t.minutes(nf.format(usedMin), nf.format(limitMin))}</strong>
          <div className="cx-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={t.audio}><i style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="cx-tile"><p>{t.requests}</p><strong>{nf.format(requests)}</strong></div>
        <div className="cx-tile"><p>{t.keys}</p><strong>{t.keysOf(activeKeys, MAX_ACTIVE_KEYS)}</strong></div>
      </div>

      <div className="cx-card cx-first">
        <div className="cx-card-head"><div><h2>{t.firstH}</h2><p className="cx-muted">{t.firstLede}</p></div></div>
        <ol className="cx-steps">
          <li>
            <span className="cx-step-n">1</span>
            <div><h3>{t.step1}</h3>
              {approved && <a className="cx-btn" href={L("/account/keys")}><Icon name="key" size={16} stroke={1.6} />{t.createKey}</a>}
            </div>
          </li>
          <li>
            <span className="cx-step-n">2</span>
            <div><h3>{t.step2}</h3>
              <pre className="cx-code"><code>export NAMU_API_KEY=&quot;namu_sk_…&quot;</code></pre>
              <p className="cx-muted">{t.envNote}</p>
            </div>
          </li>
          <li>
            <span className="cx-step-n">3</span>
            <div><h3>{t.step3}</h3>
              <CodeTabs code={code} copyLabel={t.copy} copiedLabel={t.copied} />
            </div>
          </li>
        </ol>
      </div>

      <div className="cx-card">
        <div className="cx-card-head"><div><h2>{t.modelsH}</h2><p className="cx-muted">{t.modelsLede}</p></div></div>
        <ul className="cx-models">
          {SCOPES.map(s => (
            <li key={s}>
              <span className="cx-model-name">{m[s].name}</span>
              <span className="cx-muted">{m[s].task}</span>
              <code>POST {ENDPOINT[s]}</code>
              <a href={L(`/docs#${s}`)}>{t.read}<Icon name="arrow-long" size={15} stroke={1.6} /></a>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
