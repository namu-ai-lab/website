"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../Icon";
import { LocalTime } from "../console/LocalTime";
import { VoiceAvatar } from "../platform/pickers";
import { fileFor, interpret, save, speak } from "./client";
import { createCopy } from "@/content/create";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { formatSeconds } from "@/i18n/format";
import { Recorder, toClip } from "@/lib/audio";
import { isVoiceId, language, voice as voiceOf, type LangCode } from "@/lib/catalog";
import type { IconName } from "@/lib/icons";
import { LIMITS } from "@/lib/limits";
import { fileName, type Message } from "@/lib/project-shape";

/* Pieces Create's pages share: the Blossom drawing itself while a model works, a chip that opens a short list, one
   sound at a time across the page, and the list of messages the organisation made. */

/** The Blossom draws itself once while a model works; the words say what it is doing. */
export function Making({ label }: { label: string }) {
  return (
    <div className="cr-making" role="status">
      <svg viewBox="0 0 120 120" aria-hidden="true"><path d="M 104 60 A 44 44 0 1 0 60 104" /><circle cx="60" cy="104" r="8" /></svg>
      <span>{label}</span>
    </div>
  );
}

export type ChipOption = { id: string; label: ReactNode; disabled?: boolean; end?: ReactNode };
/** A chip that opens a short list below it; closes on a choice, a click outside or Escape. */
export function ChipMenu({ value, options, onPick, label }: { value: ReactNode; options: ChipOption[]; onPick: (id: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null), btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <span className="cr-menu" ref={box}>
      <button ref={btn} type="button" className="cr-chip" aria-expanded={open} aria-label={label} onClick={() => setOpen(o => !o)}>
        {value}<Icon name="chevron" size={14} stroke={1.6} />
      </button>
      {open && (
        <span className="cr-pop" role="listbox" aria-label={label}>
          {options.map(o => (
            <span key={o.id} className="cr-pop-row">
              <button type="button" role="option" aria-selected={false} disabled={o.disabled} onClick={() => { onPick(o.id); setOpen(false); btn.current?.focus(); }}>{o.label}</button>
              {o.end && <span className="cr-pop-end">{o.end}</span>}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

/* one sound at a time across the page */
let current: { el: HTMLAudioElement; stop: () => void } | null = null;
/** Plays `src` (a URL or a Blob); a second press stops it, and another sound stops this one. */
export function usePlay() {
  const [on, setOn] = useState(false), [pos, setPos] = useState(0);
  const me = useRef<{ el: HTMLAudioElement; stop: () => void } | null>(null);
  useEffect(() => () => { me.current?.stop(); }, []);
  const play = (src: string | Blob) => {
    if (me.current && current === me.current) { me.current.stop(); return; }
    current?.stop();
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    const el = new Audio(url);
    const stop = () => { el.pause(); setOn(false); setPos(0); if (typeof src !== "string") URL.revokeObjectURL(url); if (current === me.current) current = null; me.current = null; };
    el.ontimeupdate = () => setPos(el.duration ? el.currentTime / el.duration : 0);
    el.onended = stop;
    me.current = current = { el, stop };
    void el.play().then(() => setOn(true)).catch(stop);
  };
  return { on, pos, play, stop: () => me.current?.stop() };
}

/** The microphone: start, stop, and the recording handed to `onBlob`; `level` and `elapsed` drive a meter. */
export function useRecorder(onBlob: (b: Blob) => void, onError: () => void, maxS = LIMITS.audioMinutes * 60) {
  const rec = useRef<Recorder | null>(null);
  const [on, setOn] = useState(false), [level, setLevel] = useState(0), [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t0 = Date.now();
    const id = window.setInterval(() => { setElapsed((Date.now() - t0) / 1000); setLevel(rec.current?.level ?? 0); }, 80);
    return () => clearInterval(id);
  }, [on]);
  useEffect(() => () => { void rec.current?.stop(); }, []);
  const stop = async () => { const r = rec.current; rec.current = null; setOn(false); if (r) onBlob(await r.stop()); };
  const start = async () => {
    if (rec.current) return;
    const r = (rec.current = new Recorder());
    try { await r.start(maxS, () => void stop()); }
    catch { if (rec.current === r) rec.current = null; onError(); return; }
    if (rec.current !== r) return;
    setElapsed(0); setOn(true);
  };
  return { on, level, elapsed, toggle: () => void (rec.current ? stop() : start()) };
}

/** A sound file's length, read from its metadata. */
export function useLength(src?: string) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!src) return;
    const a = new Audio(); a.preload = "metadata"; a.src = src;
    a.onloadedmetadata = () => setS(a.duration);
    return () => { a.src = ""; };
  }, [src]);
  return s;
}

/** A small play pill with the sound's length. */
export function MiniPlay({ src, label }: { src: string; label: string }) {
  const { on, play } = usePlay(), len = useLength(src);
  return (
    <button type="button" className={`cr-mini${on ? " on" : ""}`} aria-label={label} aria-pressed={on} onClick={() => play(src)}>
      <Icon name={on ? "pause" : "play"} size={13} stroke={1.6} />{len ? formatSeconds(len) : ""}
    </button>
  );
}


/** The made sound, the way people receive it: a voice note with what says it beside it. */
export function VoiceNote({ children, tail }: { children: ReactNode; tail?: ReactNode }) {
  return <div className="cr-note">{children}{tail && <span className="cr-note-tail">{tail}</span>}</div>;
}

export const OUTPUT_ICON: Record<Message["madeFor"], IconName> = { whatsapp: "share", radio: "volume", phone: "phone-voice", file: "download" };

/** The messages the organisation made, newest first: each plays (made again from its words) and downloads for its
    channel. */
export function MessageList({ lang, list, ready }: { lang: Lang; list: Message[]; ready: boolean }) {
  const t = createCopy[lang], p = platformCopy[lang];
  if (!ready) return <p className="cr-none">{p.notReady[1]}</p>;
  if (!list.length) return <p className="cr-none">{t.home.none}</p>;
  return <ul className="cr-list">{list.map(m => <MessageRow key={m.id} m={m} lang={lang} />)}</ul>;
}

function MessageRow({ m, lang }: { m: Message; lang: Lang }) {
  const t = createCopy[lang], p = platformCopy[lang];
  const { on, play, stop } = usePlay();
  const [busy, setBusy] = useState(false), [err, setErr] = useState(false);
  const voice = m.voice && isVoiceId(m.voice) ? voiceOf(m.voice) : null;
  const sound = async () => { setBusy(true); setErr(false); try { return await speak(m.text, m.lang, m.voice); } catch { setErr(true); return null; } finally { setBusy(false); } };
  const listen = async () => { if (on) { stop(); return; } const b = await sound(); if (b) play(b); };
  const download = async () => { const b = await sound(); if (b) { const f = await fileFor(b, m.madeFor, fileName(m.title, language(m.lang).endonym, "x").replace(/\.x$/, "")); save(f, f.name); } };
  return (
    <li className="cr-row">
      <button type="button" className={`cr-round${on ? " on" : ""}`} aria-label={on ? p.pause : p.play} onClick={() => void listen()} disabled={busy}>
        {busy ? <span className="cx-dots" aria-hidden="true"><i /><i /><i /></span> : <Icon name={on ? "pause" : "play"} size={14} stroke={1.6} />}
      </button>
      <span className="cr-row-main"><strong>{m.title}</strong><em lang={m.lang}>{m.text}</em></span>
      <span className="cr-row-meta hide-sm">{voice && <VoiceAvatar v={voice} size={22} />}{language(m.lang).endonym}{voice ? ` · ${voice.name}` : ""}</span>
      <span className="cr-row-meta hide-sm"><Icon name={OUTPUT_ICON[m.madeFor]} size={16} stroke={1.5} />{p.outputs[m.madeFor]}</span>
      <span className="cr-row-meta"><LocalTime iso={m.updatedAt} lang={lang} style="dayMonth" rel /></span>
      <button type="button" className="cr-round" aria-label={p.download} onClick={() => void download()} disabled={busy}><Icon name="download" size={15} stroke={1.6} /></button>
      {err && <span className="cx-error" role="alert">{t.errors.generic}</span>}
    </li>
  );
}

/** Where a language can only be heard (written French reaches Kora by voice until the API translates text): a large
    microphone in place of the text box. What was said comes back in `to`, with the words heard in `from`. */
export function VoiceEntry({ ui, from, to, onResult, onError, aside }:
  { ui: Lang; from: LangCode; to: LangCode; onResult: (r: { heard: string; text: string }) => void; onError: (m: string) => void; aside?: ReactNode }) {
  const c = createCopy[ui], [busy, setBusy] = useState(false);
  const heard = async (b: Blob) => {
    setBusy(true);
    try {
      const clip = await toClip(b, "speech.wav");
      const body = clip.wav.size <= LIMITS.playgroundUploadMb * 1024 * 1024 ? clip.wav : clip.source;
      const r = await interpret(body, from, to);
      if (r.text.trim()) onResult({ heard: r.sourceText.trim(), text: r.text.trim() }); else onError(c.read.nothing);
    } catch (e) { onError(e instanceof Error ? e.message : c.errors.generic); } finally { setBusy(false); }
  };
  const rec = useRecorder(b => void heard(b), () => onError(c.errors.mic));
  const name = language(from).name[ui];
  return (
    <div className="cr-voice-entry">
      {busy ? <Making label={c.read.listening} /> : (
        <>
          <button type="button" className={`cr-rec${rec.on ? " on" : ""}`} aria-pressed={rec.on} aria-label={rec.on ? c.read.stop : c.home.speakIn(name)}
            onClick={rec.toggle} style={{ ["--lvl" as string]: String(Math.min(1, rec.level * 1.6)) }}>
            <Icon name={rec.on ? "stop" : "microphone"} size={28} stroke={1.5} />
          </button>
          <p role={rec.on ? "status" : undefined}>{rec.on ? formatSeconds(rec.elapsed) : c.home.speakIn(name)}</p>
          {!rec.on && aside}
        </>
      )}
    </div>
  );
}
