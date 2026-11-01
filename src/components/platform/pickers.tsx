"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { language, voicesFor, type LangCode, type Voice, type VoiceId } from "@/lib/catalog";

/* Choosing on the platform, shared by every door: a language (from the catalog, those not ready yet shown as Soon),
   a voice (with its sample), and the letters a keyboard lacks for the language being written. */

/** Languages as chips; those the platform cannot use yet are shown, quietly, and cannot be chosen. */
export function LanguageChips({ value, onPick, options, ready, soon, label }:
  { value: LangCode; onPick: (l: LangCode) => void; options: readonly LangCode[]; ready: (l: LangCode) => boolean; soon: string; label: string }) {
  return (
    <div className="pf-langs" role="radiogroup" aria-label={label}>
      {options.map(l => {
        const ok = ready(l);
        return (
          <button key={l} type="button" role="radio" className="pf-chip" aria-checked={l === value} disabled={!ok}
            onClick={() => onPick(l)}>
            {language(l).endonym}{!ok && <span className="pf-soon">{soon}</span>}
          </button>
        );
      })}
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
        <VoiceAvatar v={chosen} /><span>{chosen.name}</span><Icon name="chevron" size={16} stroke={1.6} />
      </button>
      {open && (
        <ul className="pf-voice-list">
          {list.map(v => (
            <li key={v.id}>
              <button type="button" aria-pressed={v.id === chosen.id} onClick={() => { onPick(v.id as VoiceId); setOpen(false); btn.current?.focus(); }}>
                <VoiceAvatar v={v} /><span>{v.name}</span>{v.id === chosen.id && <Icon name="check" size={15} stroke={1.8} />}
              </button>
              <SampleButton src={v.sample} label={`${playLabel} ${v.name}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TONES: [string, string, string][] = [["#ffd8b8", "#e8935a", "#b4552a"], ["#f6e6d6", "#c4865a", "#5e3418"], ["#f4ece2", "#8fa6d6", "#3d4a78"], ["#f4dcc4", "#d97a6c", "#7a3125"]];
/** A voice's sphere: the same warm glass as the models', its tone fixed by the voice's id. */
export function VoiceAvatar({ v, size = 26 }: { v: Pick<Voice, "id">; size?: number }) {
  const [a, b, c] = TONES[[...v.id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % TONES.length];
  return <i className="pf-voice-orb" style={{ width: size, height: size, background: `radial-gradient(circle at 34% 30%, ${a} 0, ${b} 50%, ${c} 100%)` }} aria-hidden="true" />;
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
