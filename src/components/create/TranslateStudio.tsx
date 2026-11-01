"use client";

import { useState } from "react";
import { Icon } from "../Icon";
import { CopyButton } from "../ui/CopyButton";
import { Making, useRecorder } from "./bits";
import { interpret, translate } from "./client";
import { SayIt } from "./ReadStudio";
import { createCopy } from "@/content/create";
import { TRY_NOTES } from "@/content/ideas";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { formatSeconds } from "@/i18n/format";
import { toClip } from "@/lib/audio";
import { LIMITS } from "@/lib/limits";
import { WRITTEN, can, canTranslate, language, modelFor, type LangCode } from "@/lib/catalog";

/* Translate (mock-up v2): a local language and French side by side, either way round. Written words go through
   Kora's text path; a recording goes through its speech path, which also says what it heard. The pairs come from the
   catalog, so a language Kora learns appears here by itself. */
const UPLOAD = LIMITS.playgroundUploadMb * 1024 * 1024;

export function TranslateStudio({ lang: ui }: { lang: Lang }) {
  const t = createCopy[ui].translate, c = createCopy[ui], p = platformCopy[ui];
  const pairs = modelFor("translate").pairs ?? [];
  const start = pairs.find(([, b]) => b === WRITTEN) ?? pairs[0];
  const [from, setFrom] = useState<LangCode>(start?.[0] ?? "ha");
  const [to, setTo] = useState<LangCode>(start?.[1] ?? WRITTEN);
  const [text, setText] = useState(""), [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);

  const go = async (words = text) => {
    const w = words.trim(); if (!w) return;
    setBusy(true); setErr(null); setOut(null);
    try { setOut(await translate(w, from, to)); } catch (e) { setErr(e instanceof Error ? e.message : c.errors.generic); } finally { setBusy(false); }
  };
  const heard = async (b: Blob) => {
    setBusy(true); setErr(null); setOut(null);
    try {
      let clip;
      try { clip = await toClip(b, "recording.wav"); } catch { setErr(p.record.decode); return; }
      const body = clip.wav.size <= UPLOAD ? clip.wav : clip.source;
      const r = await interpret(body, from, to);
      setText(r.sourceText); setOut(r.text);
    } catch (e) { setErr(e instanceof Error ? e.message : c.errors.generic); } finally { setBusy(false); }
  };
  const rec = useRecorder(b => void heard(b), () => setErr(c.errors.mic));
  const swap = () => { if (!canTranslate(to, from)) return; setFrom(to); setTo(from); setText(out ?? ""); setOut(text.trim() ? text : null); };
  const examples = TRY_NOTES.map(n => (from === "ha" ? n.ha : from === WRITTEN ? n.fr : null)).filter((x): x is string => !!x);
  const labels = { copy: t.copy, copied: t.copied, failed: c.errors.generic };

  return (
    <div className="cr-translate">
      <div className="cr-swap">
        <span className="cr-chip static">{language(from).endonym}</span>
        <button type="button" className="cr-round" aria-label={t.swap} title={t.swap} onClick={swap} disabled={busy || !canTranslate(to, from)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h15M15.5 4.5 19 8l-3.5 3.5M20 16H5M8.5 12.5 5 16l3.5 3.5" />
          </svg>
        </button>
        <span className="cr-chip static">{language(to).endonym}</span>
      </div>
      <div className="cr-pair">
        <section className="cr-pane">
          <span className="cr-label">{language(from).endonym}
            <button type="button" className={`cr-mic${rec.on ? " rec" : ""}`} aria-pressed={rec.on} aria-label={rec.on ? t.stop : t.record} onClick={rec.toggle} disabled={busy}
              style={{ ["--lvl" as string]: String(Math.min(1, rec.level * 1.6)) }}>
              <Icon name={rec.on ? "stop" : "microphone"} size={17} stroke={1.6} />
            </button>
          </span>
          {rec.on ? <p className="cr-rec-time" role="status">{formatSeconds(rec.elapsed)}</p> : (
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder={t.placeholder} aria-label={language(from).endonym} lang={from} rows={4}
              maxLength={LIMITS.textChars} onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void go(); } }} />
          )}
          <span className="cr-pane-acts end"><button type="button" className="cx-btn primary sm" onClick={() => void go()} disabled={busy || !text.trim()}>{t.go}</button></span>
        </section>
        <section className="cr-pane">
          <span className="cr-label">{language(to).endonym}</span>
          {busy ? <Making label={t.go} /> : <p lang={out ? to : undefined} className={out ? undefined : "empty"}>{out ?? t.empty}</p>}
          <span className="cr-pane-acts">
            {out && can("speech", to) && <SayIt text={out} lang={to} label={t.listen} />}
            {out && <CopyButton text={out} labels={labels} className="cx-btn ghost sm" />}
          </span>
        </section>
      </div>
      {err && <p className="cx-error" role="alert">{err}</p>}
      {examples.length > 0 && (
        <div className="cr-examples">
          {examples.map(x => <button key={x} type="button" className="cr-chip" lang={from} onClick={() => { setText(x); void go(x); }} disabled={busy}>{x}</button>)}
        </div>
      )}
    </div>
  );
}
