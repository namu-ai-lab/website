"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { resample } from "./media";
import { language, voicesFor, type LangCode, type Voice, type VoiceId } from "@/lib/catalog";

/* Choosing on the platform, shared by every door: a language (only those that work today, from the catalog), a voice
   (with its sample), and the letters a keyboard lacks for the language being written. */

/** Languages as chips; the caller passes only languages that work today, and shows none when there is one. */
export function LanguageChips({ value, onPick, options, label }:
  { value: LangCode; onPick: (l: LangCode) => void; options: readonly LangCode[]; label: string }) {
  return (
    <div className="pf-langs" role="radiogroup" aria-label={label}>
      {options.map(l => (
        <button key={l} type="button" role="radio" className="pf-chip" aria-checked={l === value} onClick={() => onPick(l)}>{language(l).endonym}</button>
      ))}
    </div>
  );
}

/** A voice for a language: the chosen one, and a list that opens with each voice's sample. */
export function VoicePicker({ lang, value, onPick, label, playLabel }: { lang: LangCode; value: VoiceId | null; onPick: (v: VoiceId) => void; label: string; playLabel: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null), btn = useRef<HTMLButtonElement>(null);
  const list = voicesFor(lang);
  const chosen = list.find(v => v.id === value) ?? list[0];
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  if (!chosen) return null;
  return (
    <div className="pf-voice-pick" ref={box}>
      <button ref={btn} type="button" className="pf-voice-btn" aria-expanded={open} aria-label={`${label}: ${chosen.name}`} onClick={() => setOpen(o => !o)}>
        <span>{chosen.name}</span><Icon name="chevron" size={16} stroke={1.6} />
      </button>
      {open && (
        <ul className="pf-voice-list">
          {list.map(v => (
            <li key={v.id}>
              <button type="button" aria-pressed={v.id === chosen.id} onClick={() => { onPick(v.id as VoiceId); setOpen(false); btn.current?.focus(); }}>
                <span>{v.name}</span>{v.id === chosen.id && <Icon name="check" size={15} stroke={1.8} />}
              </button>
              <SampleButton src={v.sample} label={`${playLabel} ${v.name}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A voice drawn by its own sound: the outline of its sample, as bars, in its language's colour (platform.css). */
export function VoiceOutline({ v, bars = 40 }: { v: Pick<Voice, "outline" | "languages">; bars?: number }) {
  return (
    <span className="pf-outline" data-lang={v.languages[0]} aria-hidden="true">
      {resample([...v.outline], bars).map((h, i) => <i key={i} style={{ height: `${Math.max(6, h)}%` }} />)}
    </span>
  );
}

/* one sample at a time across the page */
let playing: HTMLAudioElement | null = null;
/** Plays a voice's sample; a second press, or another sample, stops it. */
export function SampleButton({ src, label }: { src: string; label: string }) {
  const [on, setOn] = useState(false);
  const a = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => { a.current?.pause(); }, []);
  const toggle = () => {
    if (on) { a.current?.pause(); setOn(false); return; }
    playing?.pause();
    const el = (a.current ??= new Audio(src));
    el.currentTime = 0; playing = el;
    el.onended = el.onpause = () => setOn(false);
    void el.play().then(() => setOn(true)).catch(() => setOn(false));
  };
  return (
    <button type="button" className="pf-sample" aria-label={label} aria-pressed={on} onClick={toggle}>
      <Icon name={on ? "pause" : "play"} size={14} stroke={1.6} />
    </button>
  );
}

/** The letters a keyboard lacks for `lang`, each inserted where the cursor is in `target`. */
export function Letters({ lang, target, onInsert }: { lang: LangCode; target: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>; onInsert: (next: string) => void }) {
  const letters = language(lang).letters;
  if (!letters.length) return null;
  const insert = (ch: string) => {
    const el = target.current; if (!el) return;
    const s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? s;
    const next = el.value.slice(0, s) + ch + el.value.slice(e);
    onInsert(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + ch.length, s + ch.length); });
  };
  return (
    <div className="pf-letters" aria-label={language(lang).endonym}>
      {letters.map(ch => <button key={ch} type="button" onMouseDown={e => e.preventDefault()} onClick={() => insert(ch)}>{ch}</button>)}
    </div>
  );
}
