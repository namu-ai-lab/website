"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { Highlight } from "../Highlight";
import { CopyButton } from "../ui/CopyButton";
import type { CodeLang } from "../CodeTabs";
import { LocalTime } from "./LocalTime";
import { consoleCopy } from "@/content/console";
import type { Lang } from "@/i18n/config";

/* The API door's first visit, after ElevenAPI's "Get started": a prompt to paste into a coding agent (which reads
   /llms.txt and does the rest), or the first request written out in JavaScript, Python or cURL; and a line that waits
   for that request and shows it the moment it lands (/api/account/first-request, every 3 s while the page is seen). */
type Tab = "agent" | "JavaScript" | "Python" | "cURL";
const TABS: Tab[] = ["agent", "JavaScript", "Python", "cURL"];
type Landed = { endpoint: string; status: number; at: string; latencyMs: number };

export function GetStarted({ lang, code, hasKey, keysHref, logsHref }:
  { lang: Lang; code: Record<CodeLang, string>; hasKey: boolean; keysHref: string; logsHref: string }) {
  const t = consoleCopy[lang].start;
  const [tab, setTab] = useState<Tab>("agent");
  const [landed, setLanded] = useState<Landed | null>(null);
  const shown = useRef<HTMLElement>(null);

  useEffect(() => {
    if (landed) return;
    let live = true, timer = 0;
    const poll = async () => {
      if (!document.hidden) {
        try {
          const r = await fetch("/api/account/first-request", { cache: "no-store" });
          const j = r.ok ? await r.json() as { request: Landed | null } : null;
          if (live && j?.request) { setLanded(j.request); return; }
        } catch { /* offline for a moment: the next tick tries again */ }
      }
      if (live) timer = window.setTimeout(poll, 3000);
    };
    void poll();
    return () => { live = false; clearTimeout(timer); };
  }, [landed]);

  const text = tab === "agent" ? t.prompt : code[tab];
  return (
    <div className="cx-start">
      <div className="cx-seg cx-start-tabs" role="tablist" aria-label={t.title}>
        {TABS.map(x => (
          <button key={x} type="button" role="tab" aria-selected={x === tab} onClick={() => setTab(x)}>{x === "agent" ? t.agent : x}</button>
        ))}
      </div>

      {tab !== "agent" && !hasKey && (
        <div className="cx-start-step">
          <span className="cx-start-n">1</span>
          <p>{t.keyH}</p>
          <a className="cx-btn sm" href={keysHref}><Icon name="key" size={15} stroke={1.6} />{t.keyCta}</a>
        </div>
      )}
      <div className="cx-start-step">
        <span className="cx-start-n">{tab !== "agent" && !hasKey ? 2 : <Icon name="chevron" size={14} stroke={1.8} className="rot-90" />}</span>
        <p>{tab === "agent" ? t.pasteH : t.codeH}</p>
      </div>
      <div className={`cx-start-code${tab === "agent" ? " prompt" : ""}`}>
        <pre><code ref={shown}>{tab === "agent" ? text : <Highlight code={text} lang={tab} />}</code></pre>
        <CopyButton text={text} labels={{ copy: tab === "agent" ? t.copyPrompt : t.copy, copied: t.copied, failed: t.copyFailed }}
          select={shown} className="cx-start-copy" />
      </div>

      <div className={`cx-start-listen${landed ? " landed" : ""}`} role="status" aria-live="polite">
        {landed ? (
          <>
            <span className="cx-start-ok"><Icon name="check" size={15} stroke={2} /></span>
            <span>{t.landed}</span>
            <code>POST /v1/{landed.endpoint}</code>
            <span className={`cx-status s${String(landed.status)[0]}`}>{landed.status}</span>
            <span className="cx-muted cx-small"><LocalTime iso={landed.at} lang={lang} rel /></span>
            <a className="cx-btn sm primary" href="?view=dashboard">{t.toDashboard}</a>
          </>
        ) : (
          <>
            <span className="cx-start-dot" aria-hidden="true" />
            <span>{t.listening}</span>
            <a className="cx-start-log" href={logsHref}>{t.toLogs}<Icon name="arrow-long" size={14} stroke={1.6} /></a>
          </>
        )}
      </div>
    </div>
  );
}

/** "Skip to dashboard": remembered on this browser, so Home opens on the dashboard from then on. */
export function SkipStart({ label }: { label: string }) {
  return (
    <button type="button" className="cx-btn" onClick={() => { document.cookie = "namu_api_start=skip; path=/; max-age=31536000; samesite=lax"; window.location.search = "?view=dashboard"; }}>
      {label}
    </button>
  );
}
