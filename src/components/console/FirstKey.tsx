"use client";

import { useState, type FormEvent } from "react";
import { CodeTabs } from "../CodeTabs";
import { Icon } from "../Icon";
import { consoleCopy } from "@/content/console";
import { samples } from "@/content/docs";
import { lp, type Lang } from "@/i18n/config";
import { SCOPES } from "@/lib/key-shape";

/* A new developer's first minutes, after OpenAI's "Make your first API call": name a key and create it here, see it
   once, export it, call the API. The key goes through the same route as the API keys page (/api/keys). */
export function FirstKey({ lang, apiBase }: { lang: Lang; apiBase: string }) {
  const t = consoleCopy[lang].overview;
  const [name, setName] = useState(t.keyNamePh);
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<"key" | "env" | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true); setErr(null);
    const res = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), scopes: [...SCOPES] }) }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok || !json?.key) { setErr(json?.error?.message ?? consoleCopy[lang].keys.error); return; }
    setKey(json.key as string);
  }
  const copy = async (text: string, what: "key" | "env") => { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1600); };
  const env = `export NAMU_API_KEY="${key ?? "namu_sk_…"}"`;

  return (
    <div className="cx-card cx-start">
      <div className="cx-card-head"><div><h2>{t.firstH}</h2><p className="cx-muted">{t.startLede}</p></div></div>
      <ol className="cx-steps">
        <li className={key ? "done" : undefined}>
          <span className="cx-step-n">{key ? <Icon name="check" size={15} stroke={1.8} /> : 1}</span>
          <div>
            <h3>{t.step1}</h3>
            {key ? (
              <div className="cx-first-key">
                <div className="cx-secret-box">
                  <input readOnly value={key} aria-label={t.created} onFocus={e => e.currentTarget.select()} />
                  <button type="button" className="cx-btn" onClick={() => copy(key, "key")}><Icon name={copied === "key" ? "check" : "copy"} size={16} stroke={1.6} />{copied === "key" ? t.copied : t.copy}</button>
                </div>
                <p className="cx-muted cx-small">{t.shownOnce}</p>
              </div>
            ) : (
              <form className="cx-first-form" onSubmit={create}>
                <label className="sr-only" htmlFor="cx-first-name">{t.keyName}</label>
                <input id="cx-first-name" className="cx-input" value={name} maxLength={60} onChange={e => setName(e.target.value)} />
                <button type="submit" className="cx-btn primary" disabled={busy || !name.trim()}><Icon name="key" size={16} stroke={1.6} />{busy ? t.creating : t.newKey}</button>
                {err && <span className="cx-error" role="alert">{err}</span>}
              </form>
            )}
          </div>
        </li>
        <li>
          <span className="cx-step-n">2</span>
          <div>
            <h3>{t.step2}</h3>
            <div className="cx-env">
              <pre className="cx-code"><code>{env}</code></pre>
              {key && <button type="button" className="cx-icon-btn" onClick={() => copy(env, "env")} aria-label={t.copy}><Icon name={copied === "env" ? "check" : "copy"} size={16} stroke={1.6} /></button>}
            </div>
            <p className="cx-muted cx-small">{t.envNote}</p>
          </div>
        </li>
        <li>
          <span className="cx-step-n">3</span>
          <div>
            <h3>{t.step3}</h3>
            <CodeTabs code={samples(apiBase).speech} copyLabel={t.copy} copiedLabel={t.copied} />
          </div>
        </li>
      </ol>
      <p className="cx-start-foot">{t.tryFirst} <a className="cx-btn" href={lp(lang, "/account/playground")}><Icon name="waveform" size={16} stroke={1.6} />{t.playground}</a></p>
    </div>
  );
}
