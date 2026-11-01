"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "../Icon";
import { resample } from "../platform/media";
import { usePlay } from "./bits";
import { fileFor, share, speak } from "./client";
import { voiced } from "./interpreter";
import { createCopy } from "@/content/create";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { formatDate, formatSeconds } from "@/i18n/format";
import { shapeOfBlob } from "@/lib/audio";
import { WRITTEN, defaultVoice, language, type LangCode } from "@/lib/catalog";
import type { Turn } from "@/lib/interpretation-shape";
import { fileName } from "@/lib/project-shape";
import { recording } from "@/lib/recordings";

/* The Interpreter's turns, as its page (the latest one) and its history (a whole conversation) draw them: the voice
   that was heard on its side, Namu's voice facing it, an arrow and the time between. Sides follow the language: the
   local one on the left ("a"), French on the right ("b"). No words are shown. */
export type Shown = Turn & { mine?: Blob; sound?: Blob | null };
type Shape = { peaks: number[]; seconds: number };   // peaks 0 to 100, as a turn keeps them
export const sideOf = (l: LangCode): "a" | "b" => (l === WRITTEN ? "b" : "a");

/** Namu's voice for a set of turns: one player, so one translation speaks at a time, and each voice's shape once it
    is made. `onSay` hears which voice is about to play and its outline (0 to 1), for a voice line to follow it. */
export function useSayer(kitVoices: Partial<Record<string, string>>, onSay?: (turn: Shown, peaks: number[]) => void) {
  const voice = usePlay();
  const [now, setNow] = useState<string | null>(null), [making, setMaking] = useState<string | null>(null);
  const [shapes, setShapes] = useState<Record<string, Shape>>({});
  /* the voice a turn is said in: its own, or, for a turn kept before its language had one, the language's voice now */
  const voiceOf = (x: Turn) => x.voice ?? (voiced(x.to) ? defaultVoice(x.to, kitVoices) : null);
  const say = async (x: Shown, sound?: Blob | null) => {
    if (now === x.id && voice.on) { voice.stop(); return; }
    const v = voiceOf(x);
    if (!v) return;
    setMaking(x.id);
    try {
      const b = sound ?? x.sound ?? await speak(x.text, x.to, v);
      const s = shapes[x.id] ?? await shapeOfBlob(b).then(o => ({ peaks: o.peaks.map(p => p * 100), seconds: o.seconds })).catch(() => ({ peaks: [], seconds: 0 }));
      setShapes(m => ({ ...m, [x.id]: s }));
      onSay?.(x, s.peaks.map(p => p / 100));
      voice.stop(); setNow(x.id); voice.play(b);
    } catch { /* the button stays as it was */ } finally { setMaking(null); }
  };
  return { voice, now, making, shapes, voiceOf, say, stop: () => { voice.stop(); setNow(null); } };
}
export type Sayer = ReturnType<typeof useSayer>;

/** One turn, kept: what was said on its side, Namu's translation facing it. */
export function TurnLane({ turn, ui, sayer }: { turn: Shown; ui: Lang; sayer: Sayer }) {
  const t = createCopy[ui].interpret, p = platformCopy[ui], mounted = useMounted();
  const on = sayer.now === turn.id && sayer.voice.on, v = sayer.voiceOf(turn), shape = sayer.shapes[turn.id];
  return (
    <li className="cr-lane" data-from={sideOf(turn.from)}>
      <SaidPill side={sideOf(turn.from)} sound={turn.mine} id={turn.id} peaks={turn.peaks} seconds={turn.seconds} ui={ui} />
      <span className="cr-lane-way">
        <Icon name="arrow-long" size={16} stroke={1.5} />
        {mounted && <time dateTime={turn.at}>{formatDate(ui, turn.at, { style: "time", zone: "local" })}</time>}
      </span>
      <Pill kind="namu" side={sideOf(turn.to)} label={on ? p.pause : t.listen} off={!v} on={on} pos={on ? sayer.voice.pos : 0}
        busy={sayer.making === turn.id} peaks={shape?.peaks} seconds={shape?.seconds} onToggle={() => void sayer.say(turn)}
        end={v && <SendIt turn={turn} voice={v} label={t.share} />} />
    </li>
  );
}

/** A voice note as a pill: play, its outline (moving as it plays), its length. `off`: nothing to play (a recording
    this browser did not keep), a quiet outline with a microphone where play would be. `busy`: being made. */
export function Pill({ kind, side, on = false, pos = 0, busy = false, off = false, peaks, seconds, label, onToggle, end }: {
  kind: "said" | "namu"; side: "a" | "b"; on?: boolean; pos?: number; busy?: boolean; off?: boolean;
  peaks?: number[]; seconds?: number; label: string; onToggle?: () => void; end?: ReactNode;
}) {
  const bars = peaks?.length ? resample(peaks, 28) : null;
  return (
    <div className={`cr-pill ${kind}${off ? " off" : ""}${on ? " on" : ""}`} data-side={side}>
      <button type="button" className="cr-pill-play" onClick={onToggle} disabled={off || busy || !onToggle} aria-label={label} aria-pressed={on}>
        {busy ? <span className="cx-dots" aria-hidden="true"><i /><i /><i /></span> : <Icon name={off ? "microphone" : on ? "pause" : "play"} size={15} stroke={1.6} />}
      </button>
      <span className="cr-pill-wave" aria-hidden="true">
        {bars ? bars.map((b, i) => <i key={i} className={on && i / bars.length < pos ? "on" : undefined} style={{ height: `${Math.max(14, b)}%` }} />) : <b />}
      </span>
      {!!seconds && <span className="cr-pill-len">{formatSeconds(seconds)}</span>}
      {end}
    </div>
  );
}

/** What was said: the person's own recording, played from this page or from this browser's keeping. */
export function SaidPill({ side, sound, id, peaks, seconds, ui }: { side: "a" | "b"; sound?: Blob; id?: string; peaks: number[]; seconds: number; ui: Lang }) {
  const p = platformCopy[ui];
  const { on, pos, play } = usePlay();
  const [kept, setKept] = useState<Blob | null | undefined>(sound);   // undefined while this browser is asked for it
  useEffect(() => {
    if (sound || !id) return;
    let live = true;
    void recording(id).then(b => { if (live) setKept(b); });
    return () => { live = false; };
  }, [id, sound]);
  return <Pill kind="said" side={side} on={on} pos={pos} off={kept === null} peaks={peaks} seconds={seconds} label={on ? p.pause : p.play}
    onToggle={kept ? () => play(kept) : undefined} />;
}

/** Sends a translation's voice as a WhatsApp voice note (the share sheet on a phone, a download elsewhere). */
function SendIt({ turn, voice, label }: { turn: Shown; voice: string; label: string }) {
  const send = async () => {
    try {
      const b = turn.sound ?? await speak(turn.text, turn.to, voice);
      await share(await fileFor(b, "whatsapp", fileName(`namu-${turn.at.slice(0, 16).replace(/\D/g, "")}`, language(turn.to).endonym, "x").replace(/\.x$/, "")));
    } catch { /* the button stays as it was */ }
  };
  return <button type="button" className="cr-pill-send" aria-label={label} title={label} onClick={() => void send()}><Icon name="share" size={14} stroke={1.6} /></button>;
}

/* Times in the reader's own zone, so they appear only once the page runs in the browser. */
const never = () => () => {};
export const useMounted = () => useSyncExternalStore(never, () => true, () => false);
