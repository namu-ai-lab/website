"use client";

import { useRef, useState } from "react";
import { Icon } from "../Icon";
import { CopyButton } from "../ui/CopyButton";
import { AudioPlayer } from "../platform/media";
import { LanguageChips } from "../platform/pickers";
import { Making, VoiceNote, usePlay, useRecorder } from "./bits";
import { listen, speak } from "./client";
import { createCopy } from "@/content/create";
import { TRY_NOTES, type TryNote } from "@/content/ideas";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { formatSeconds } from "@/i18n/format";
import { toClip } from "@/lib/audio";
import { WRITTEN, can, canTranslate, defaultVoice, language, localFor, type LangCode } from "@/lib/catalog";
import { LIMITS } from "@/lib/limits";

/* Read a voice note (mock-up v2): speak, drop or choose a recording in a local language, or try one of Namu's; what
   was said comes back with its French beside it, for the organisation that reads French. The model gives the words
   only: no timestamps, no speakers. What was read stays on this page until it is left. */
type Read = { id: number; audio: Blob; lang: LangCode; text: string; translation?: string; at: number };
const UPLOAD = LIMITS.playgroundUploadMb * 1024 * 1024;

export function ReadStudio({ lang: ui }: { lang: Lang }) {
  const t = createCopy[ui].read, c = createCopy[ui], p = platformCopy[ui];
  const heardIn = localFor("transcribe");
  const [lang, setLang] = useState<LangCode>(heardIn[0] ?? "ha");
  const [busy, setBusy] = useState(false), [over, setOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [out, setOut] = useState<Read | null>(null);
  const [log, setLog] = useState<Read[]>([]);
  const file = useRef<HTMLInputElement>(null), ids = useRef(0);
  const french = lang !== WRITTEN && canTranslate(lang, WRITTEN);

  const run = async (blob: Blob, name: string) => {
    setErr(null); setOut(null); setBusy(true);
    try {
      let clip;
      try { clip = await toClip(blob, name); } catch { setErr(p.record.decode); return; }
      if (clip.seconds > LIMITS.audioMinutes * 60) { setErr(p.record.long(LIMITS.audioMinutes)); return; }
      const body = clip.wav.size <= UPLOAD ? clip.wav : clip.source.size <= UPLOAD ? clip.source : null;
      if (!body) { setErr(c.errors.big(LIMITS.playgroundUploadMb)); return; }
      const r = await listen(body, lang, french ? WRITTEN : undefined);
      const read: Read = { id: ++ids.current, audio: clip.wav, lang, text: r.text, translation: r.translation, at: Date.now() };
      setOut(read); setLog(l => [read, ...l]);
    } catch (e) { setErr(e instanceof Error ? e.message : c.errors.generic); }
    finally { setBusy(false); }
  };
  const rec = useRecorder(b => void run(b, "recording.wav"), () => setErr(c.errors.mic));
  const tryNote = async (n: TryNote) => { try { await run(await (await fetch(n.audio)).blob(), n.audio.split("/").pop()!); } catch { setErr(c.errors.network); } };
  const drop = (e: React.DragEvent) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) void run(f, f.name); };

  return (
    <div className="cr-read">
      {heardIn.length > 1 && <LanguageChips value={lang} onPick={l => { setLang(l); setOut(null); }} options={heardIn} label={c.speak.language} />}
      <div className="cr-drop" data-over={over || undefined} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
        <button type="button" className={`cr-rec${rec.on ? " on" : ""}`} aria-pressed={rec.on} aria-label={rec.on ? t.stop : t.record} onClick={rec.toggle} disabled={busy}
          style={{ ["--lvl" as string]: String(Math.min(1, rec.level * 1.6)) }}>
          <Icon name={rec.on ? "stop" : "microphone"} size={30} stroke={1.5} />
        </button>
        {rec.on
          ? <p className="cr-rec-time" role="status">{formatSeconds(rec.elapsed)}</p>
          : <button type="button" className="cx-btn" onClick={() => file.current?.click()} disabled={busy}><Icon name="upload" size={16} stroke={1.6} />{t.upload}</button>}
        <input ref={file} type="file" accept="audio/*,.m4a,.mp3,.wav,.ogg,.opus,.webm,.flac" hidden
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void run(f, f.name); }} />
        {lang === "ha" && (
          <>
            <p className="cr-or">{t.tryOne}</p>
            <ul className="cr-try">
              {TRY_NOTES.slice(0, 2).map(n => (
                <li key={n.id}>
                  <VoiceNote><AudioPlayer src={n.audio} labels={{ play: p.play, pause: p.pause, download: p.download }} compact /></VoiceNote>
                  <button type="button" className="cx-btn ghost sm" onClick={() => void tryNote(n)} disabled={busy}>{t.readIt}</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {err && <p className="cx-error" role="alert">{err}</p>}
      {busy && <Making label={t.listening} />}
      {out && <Pair read={out} ui={ui} />}

      {log.length > 1 && (
        <section className="cr-section">
          <h2>{c.speak.history}</h2>
          <ul className="cr-list">
            {log.slice(1).map(r => (
              <li key={r.id} className="cr-row read">
                <span className="cr-row-main"><strong lang={r.lang}>{r.text || t.nothing}</strong>{r.translation && <em lang={WRITTEN}>{r.translation}</em>}</span>
                <span className="cr-row-meta">{language(r.lang).endonym}{r.translation ? ` → ${language(WRITTEN).endonym}` : ""}</span>
                <span className="cr-row-meta">{t.today}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** What was said, and its French beside it. */
function Pair({ read, ui }: { read: Read; ui: Lang }) {
  const t = createCopy[ui].read, c = createCopy[ui];
  const labels = { copy: t.copy, copied: t.copied, failed: c.errors.generic };
  return (
    <div className={`cr-pair${read.translation !== undefined ? "" : " one"}`}>
      <section className="cr-pane">
        <span className="cr-label">{language(read.lang).endonym}</span>
        <p lang={read.lang}>{read.text || t.nothing}</p>
        <span className="cr-pane-acts">{read.text && <CopyButton text={read.text} labels={labels} className="cx-btn ghost sm" />}</span>
      </section>
      {read.translation !== undefined && (
        <section className="cr-pane">
          <span className="cr-label">{language(WRITTEN).endonym}</span>
          <p lang={WRITTEN}>{read.translation}</p>
          <span className="cr-pane-acts">
            {read.translation && can("speech", WRITTEN) && <SayIt text={read.translation} lang={WRITTEN} label={t.listen} />}
            {read.translation && <CopyButton text={read.translation} labels={labels} className="cx-btn ghost sm" />}
          </span>
        </section>
      )}
    </div>
  );
}

/** Says words aloud in a language's first voice, made once and then replayed. */
export function SayIt({ text, lang, label }: { text: string; lang: LangCode; label: string }) {
  const { on, play, stop } = usePlay();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (on) { stop(); return; }
    setBusy(true);
    try { play(await speak(text, lang, defaultVoice(lang))); } catch { /* the button stays as it was */ } finally { setBusy(false); }
  };
  return (
    <button type="button" className="cx-btn ghost sm" onClick={() => void go()} disabled={busy} aria-pressed={on}>
      {busy ? <span className="cx-dots" aria-hidden="true"><i /><i /><i /></span> : <Icon name={on ? "pause" : "play"} size={14} stroke={1.6} />}{label}
    </button>
  );
}
