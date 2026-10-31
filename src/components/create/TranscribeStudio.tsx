"use client";

import { useState } from "react";
import { Icon } from "../Icon";
import { CopyButton } from "../ui/CopyButton";
import { AudioPlayer, RecordInput } from "../platform/media";
import { LanguageChips } from "../platform/pickers";
import { createCopy } from "@/content/create";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { toClip, type Clip } from "@/lib/audio";
import { LOCAL, WRITTEN, can, canTranslate, language, type LangCode } from "@/lib/catalog";
import { LIMITS } from "@/lib/limits";
import { apiError } from "./fetch";
import { FileLink } from "./FileLink";

/* Transcribe: speak, or drop a recording, in a local language; what was said comes back with its French beside it,
   for the organisation that reads French. The model gives the words only: no timestamps, no speakers. */

type Result = { text: string; translation?: string };
const UPLOAD = LIMITS.playgroundUploadMb * 1024 * 1024;
const uploadOf = (c: Clip) => (c.wav.size <= UPLOAD ? c.wav : c.source.size <= UPLOAD ? c.source : null);

export function TranscribeStudio({ lang: ui }: { lang: Lang }) {
  const t = createCopy[ui].transcribe, p = platformCopy[ui], e = createCopy[ui].errors;
  const [lang, setLang] = useState<LangCode>(LOCAL.find(l => can("transcribe", l)) ?? LOCAL[0]);
  const [clip, setClip] = useState<Clip | null>(null);
  const [busy, setBusy] = useState(false), [over, setOver] = useState(false);
  const [out, setOut] = useState<Result | null>(null), [err, setErr] = useState<string | null>(null);
  const french = lang !== WRITTEN && canTranslate(lang, WRITTEN);

  const listen = async (c: Clip) => {
    setClip(c); setOut(null); setErr(null);
    const body = uploadOf(c);
    if (!body) { setErr(e.big(LIMITS.playgroundUploadMb)); return; }
    setBusy(true);
    try {
      const q = new URLSearchParams({ lang, ...(french ? { to: WRITTEN } : {}) });
      const res = await fetch(`/api/create/listen?${q}`, { method: "POST", headers: { "Content-Type": body.type || "application/octet-stream" }, body });
      if (!res.ok) { setErr(await apiError(res, e.generic)); return; }
      setOut(await res.json() as Result);
    } catch { setErr(e.network); } finally { setBusy(false); }
  };
  const drop = async (ev: React.DragEvent) => {
    ev.preventDefault(); setOver(false);
    const f = ev.dataTransfer.files[0]; if (!f) return;
    try { await listen(await toClip(f, f.name)); } catch { setErr(p.record.decode); }
  };
  const reset = () => { setClip(null); setOut(null); setErr(null); };
  const txt = out ? new Blob([[`${language(lang).endonym}\n${out.text}`, out.translation ? `${language(WRITTEN).endonym}\n${out.translation}` : ""].filter(Boolean).join("\n\n") + "\n"], { type: "text/plain;charset=utf-8" }) : null;

  return (
    <div className="cr-listen">
      <h1>{t.title}</h1>
      <LanguageChips value={lang} onPick={l => { setLang(l); reset(); }} options={LOCAL} ready={l => can("transcribe", l)} soon={p.soon} label={t.language} />

      {!clip ? (
        <div className="cr-drop" data-over={over || undefined} onDragOver={ev => { ev.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={ev => void drop(ev)}>
          <span className="cr-mic" aria-hidden="true"><Icon name="microphone" size={30} stroke={1.5} /></span>
          <RecordInput onClip={c => void listen(c)} labels={p.record} big />
        </div>
      ) : (
        <>
          <div className="cr-clip"><AudioPlayer src={clip.wav} peaks={clip.peaks} labels={{ play: p.play, pause: p.pause, download: p.download }} /></div>
          {busy && <p className="cr-wait" role="status"><span className="cx-dots" aria-hidden="true"><i /><i /><i /></span>{t.listening}</p>}
          {out && (
            <div className={`cr-pair${out.translation ? "" : " one"}`}>
              <Words title={language(lang).endonym} text={out.text || t.nothing} lang={lang} copy={out.text} labels={{ copy: t.copy, copied: t.copied, failed: e.generic }} />
              {out.translation !== undefined && <Words title={language(WRITTEN).endonym} text={out.translation} lang={WRITTEN} copy={out.translation} labels={{ copy: t.copy, copied: t.copied, failed: e.generic }} />}
            </div>
          )}
          {err && <p className="cx-error" role="alert">{err}</p>}
          {!busy && (
            <div className="cr-acts">
              {txt && <FileLink className="cx-btn" blob={txt} name={`namu-${lang}-transcript.txt`}><Icon name="download" size={16} stroke={1.6} />{t.download}</FileLink>}
              <button type="button" className="cx-btn" onClick={reset}><Icon name="microphone" size={16} stroke={1.6} />{t.again}</button>
            </div>
          )}
        </>
      )}
      {!clip && err && <p className="cx-error" role="alert">{err}</p>}
    </div>
  );
}

function Words({ title, text, lang, copy, labels }: { title: string; text: string; lang: LangCode; copy: string; labels: { copy: string; copied: string; failed: string } }) {
  return (
    <section className="cr-words">
      <header><span className="cr-tag">{title}</span>{copy && <CopyButton text={copy} labels={labels} className="cx-icon-btn" iconOnly />}</header>
      <p lang={lang}>{text}</p>
    </section>
  );
}
