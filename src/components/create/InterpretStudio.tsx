"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "../Icon";
import { Orb } from "../platform/Orb";
import { resample } from "../platform/media";
import { unlockSound, usePlay, useRecorder } from "./bits";
import { fileFor, interpret, interpretations, remember, share, speak } from "./client";
import { interpreterLocals, voiced } from "./interpreter";
import { createCopy } from "@/content/create";
import { TRY_NOTES } from "@/content/ideas";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { formatDate, formatSeconds } from "@/i18n/format";
import { b64ToBlob, shapeOfBlob, toClip, type Clip } from "@/lib/audio";
import { WRITTEN, defaultVoice, language, voicesFor, type LangCode } from "@/lib/catalog";
import { PEAKS, PRINT_TURNS, type Interpretation, type InterpretationSummary, type PrintTurn, type Turn } from "@/lib/interpretation-shape";
import { LIMITS } from "@/lib/limits";
import { fileName } from "@/lib/project-shape";
import { forgetSome, keepRecording, recording } from "@/lib/recordings";

/* The Interpreter: voice in, voice out, and nothing written. Two people face each other across Namu: the local
   language on the left, French on the right, a microphone for each, so nobody chooses a direction, you press the
   side you speak. Between them the orb listens (it moves with the voice), thinks, then speaks the translation. Under
   them the conversation runs newest first, each turn on one line: the voice that was heard on its side, Namu's facing
   it. Below, the history: every conversation kept (lib/interpretations keeps the words, never shown, so the voice can
   be made again; the recordings stay in this browser, lib/recordings), each drawn as its voices, the local language
   above the line and French below. Colours follow the language: Kola for the local one, Sahel for French. */
type Shown = Turn & { mine?: Blob; sound?: Blob | null };
type Live = { key: string; from: LangCode; to: LangCode; clip: Clip; body: Blob; err?: string };
type Shape = { peaks: number[]; seconds: number };   // peaks 0 to 100, as a turn keeps them
type Mode = "rest" | "listen" | "think" | "talk";

const UPLOAD = LIMITS.playgroundUploadMb * 1024 * 1024;
const sideOf = (l: LangCode) => (l === WRITTEN ? "b" : "a");
const outline = (peaks: number[]) => resample(peaks, PEAKS).map(x => Math.round(x * 100));
/** what to keep of a recording: the original where it is smaller and this browser plays it, else the WAV */
const smallest = (c: Clip) => (c.source.size < c.wav.size && /^audio\/(webm|mp4|mpeg|aac|x-m4a|mp3)/.test(c.source.type) ? c.source : c.wav);
/** Namu's voice notes to try, one in each language */
const SAMPLES: Partial<Record<LangCode, string>> = { ha: TRY_NOTES.find(n => n.id === "clinic")?.audio, fr: "/usecases/translation-fr.m4a" };

export function InterpretStudio({ lang: ui, kitVoices, list: first, current, ready }: {
  lang: Lang; kitVoices: Partial<Record<string, string>>; list: InterpretationSummary[]; current: Interpretation | null; ready: boolean;
}) {
  const t = createCopy[ui].interpret, c = createCopy[ui], p = platformCopy[ui];
  const locals = interpreterLocals();
  const localOf = (turns: { from: LangCode; to?: LangCode }[]) => turns.map(x => (x.from === WRITTEN ? x.to : x.from)).find((l): l is LangCode => !!l && locals.includes(l));
  const [local, setLocal] = useState<LangCode>(() => localOf(current?.turns ?? []) ?? locals[0] ?? "ha");
  const sides = [local, WRITTEN] as const, other = (l: LangCode) => (l === WRITTEN ? local : WRITTEN);
  const [list, setList] = useState(first);
  const [conv, setConv] = useState<string | null>(current?.id ?? null);
  const [turns, setTurns] = useState<Shown[]>(current?.turns ?? []);
  const [live, setLive] = useState<Live[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null), [notKept, setNotKept] = useState(!ready);
  const [speaking, setSpeaking] = useState<LangCode | null>(null);
  /* the conversation in view: turns are kept into it one after another, and the first one creates it */
  const session = useRef<{ id: string | null }>({ id: current?.id ?? null });
  const saving = useRef<Promise<void>>(Promise.resolve());
  const file = useRef<HTMLInputElement>(null), said = useRef<LangCode | null>(null), fileLang = useRef<LangCode>(local);
  const mounted = useMounted();

  /* Namu's voice: one player for every translation, so the orb can follow it; the shapes of the voices made so far */
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
      const s = shapes[x.id] ?? await shapeOfBlob(b).then(o => ({ peaks: o.peaks.map(v => v * 100), seconds: o.seconds })).catch(() => ({ peaks: [], seconds: 0 }));
      setShapes(m => ({ ...m, [x.id]: s }));
      orb.current.peaks = s.peaks.map(v => v / 100);
      voice.stop(); setNow(x.id); voice.play(b);
    } catch { /* the button stays as it was */ } finally { setMaking(null); }
  };

  /* the orb: the voice it follows, by what is happening */
  const rec = useRecorder(b => { const l = said.current; said.current = null; setSpeaking(null); if (l) void run(l, b, "recording.wav"); },
    () => { said.current = null; setSpeaking(null); setErr(c.errors.mic); });
  const working = live.some(x => !x.err);
  const mode: Mode = speaking ? "listen" : voice.on && now ? "talk" : working ? "think" : "rest";
  const orb = useRef<{ mode: Mode; mic: number; peaks: number[]; at: () => number }>({ mode: "rest", mic: 0, peaks: [], at: () => 0 });
  useEffect(() => { orb.current.mode = mode; orb.current.mic = rec.level; orb.current.at = voice.at; });
  const level = useCallback(() => {
    const o = orb.current;
    if (o.mode === "listen") return o.mic * 1.8;
    if (o.mode === "think") return .14 + .08 * Math.sin(performance.now() / 360);
    if (o.mode === "talk") return o.peaks.length ? o.peaks[Math.min(o.peaks.length - 1, Math.floor(o.at() * o.peaks.length))] * .9 : .4;
    return 0;
  }, []);

  const keepTurn = (turn: Omit<Turn, "at">) => {
    if (!ready) return;
    const s = session.current;
    saving.current = saving.current.then(async () => {
      try {
        const k = await interpretations.add(s.id, turn);
        if (!s.id) {
          s.id = k.id;
          if (session.current === s) { setConv(k.id); history.replaceState(null, "", `${location.pathname}?c=${k.id}`); }
        }
        const drawn: PrintTurn = { from: turn.from, seconds: turn.seconds, peaks: turn.peaks };
        setList(ls => {
          const was = ls.find(x => x.id === k.id);
          const print = was ? (was.print.length < PRINT_TURNS ? [...was.print, drawn] : was.print) : [drawn];
          return [{ id: k.id, from: was?.from ?? turn.from, count: (was?.count ?? 0) + 1, updatedAt: k.turn.at, print }, ...ls.filter(x => x.id !== k.id)];
        });
      } catch { setNotKept(true); }
    });
  };

  const work = async (item: Live) => {
    const { key, from, to, clip, body } = item;
    setLive(l => l.map(x => (x.key === key ? { ...x, err: undefined } : x)));
    try {
      const v = voiced(to) ? defaultVoice(to, kitVoices) : null;
      const r = await interpret(body, from, to, v !== null);
      const text = r.text.trim();
      if (!text) throw new Error(t.nothing);
      let sound: Blob | null = null;
      if (v) {
        // the voice comes back with the translation in the language's first voice; another one is made by Speech
        if (r.audio && v === voicesFor(to)[0]?.id) { sound = b64ToBlob(r.audio); remember(text, to, v, sound); }
        else sound = await speak(text, to, v).catch(() => null);
      }
      const turn: Omit<Turn, "at"> = { id: key, from, heard: r.sourceText.trim(), to, text, voice: v, seconds: clip.seconds, peaks: outline(clip.peaks) };
      const shown: Shown = { ...turn, at: new Date().toISOString(), mine: clip.wav, sound };
      setLive(l => l.filter(x => x.key !== key));
      setTurns(ts => [...ts, shown]);
      void keepRecording(key, smallest(clip));
      keepTurn(turn);
      if (sound) void say(shown, sound);                   // said aloud as soon as it arrives
    } catch (e) {
      setLive(l => l.map(x => (x.key === key ? { ...x, err: e instanceof Error ? e.message : c.errors.generic } : x)));
    }
  };
  const run = async (from: LangCode, blob: Blob, name: string) => {
    setErr(null);
    let clip: Clip;
    try { clip = await toClip(blob, name); } catch { setErr(p.record.decode); return; }
    if (clip.seconds > LIMITS.audioMinutes * 60) { setErr(p.record.long(LIMITS.audioMinutes)); return; }
    const body = clip.wav.size <= UPLOAD ? clip.wav : clip.source.size <= UPLOAD ? clip.source : null;
    if (!body) { setErr(c.errors.big(LIMITS.playgroundUploadMb)); return; }
    const item: Live = { key: crypto.randomUUID(), from, to: other(from), clip, body };
    setLive(l => [...l, item]);
    await work(item);
  };

  const mic = (l: LangCode) => {
    unlockSound();
    if (said.current) { if (said.current === l) rec.toggle(); return; }
    voice.stop(); said.current = l; setSpeaking(l); setErr(null); rec.toggle();
  };
  const cancel = () => { said.current = null; setSpeaking(null); rec.cancel(); };
  const upload = (l: LangCode) => { unlockSound(); fileLang.current = l; file.current?.click(); };
  const sample = async (l: LangCode) => {
    unlockSound();
    const src = SAMPLES[l];
    if (src) try { await run(l, await (await fetch(src)).blob(), src.split("/").pop()!); } catch { setErr(c.errors.network); }
  };

  const show = (x: Interpretation | null) => {
    voice.stop(); session.current = { id: x?.id ?? null };
    setConv(x?.id ?? null); setTurns(x?.turns ?? []); setLive([]); setErr(null); setNow(null);
    const l = x && localOf(x.turns); if (l) setLocal(l);
    history.replaceState(null, "", x ? `${location.pathname}?c=${x.id}` : location.pathname);
  };
  const pick = async (id: string) => {
    if (id === conv) return;
    setLoading(true);
    try { show(await interpretations.get(id)); window.scrollTo({ top: 0, behavior: "smooth" }); }
    catch { setErr(c.errors.generic); } finally { setLoading(false); }
  };
  const remove = async (id: string) => {
    // its recordings go with it: those in view are known, the others are asked for first
    const ids = id === conv ? turns.map(x => x.id) : await interpretations.get(id).then(x => x.turns.map(u => u.id)).catch(() => []);
    try { await interpretations.remove(id); } catch { setErr(c.errors.generic); return; }
    void forgetSome(ids);
    setList(ls => ls.filter(x => x.id !== id));
    if (id === conv) show(null);
  };

  const count = turns.length + live.length, busy = speaking !== null;
  return (
    <div className="cr-int">
      <section className="cr-int-stage" aria-label={p.nav.interpret} data-mode={mode}>
        <div className="cr-int-face">
          {sides.map((l, i) => {
            const on = speaking === l, name = language(l).name[ui], open = voiced(other(l));
            return (
              <div key={l} className="cr-int-side" data-side={sideOf(l)} style={{ order: i ? 3 : 1 }}>
                <p className="cr-int-lang" lang={l}><i aria-hidden="true" />{language(l).endonym}</p>
                <button type="button" className={`cr-int-rec${on ? " on" : ""}`} aria-pressed={on} aria-label={on ? t.stop : c.home.speakIn(name)}
                  onClick={() => mic(l)} disabled={!open || (busy && !on)} style={{ ["--lvl" as string]: on ? String(Math.min(1, rec.level * 1.6)) : "0" }}>
                  <Icon name={on ? "stop" : "microphone"} size={30} stroke={1.5} />
                </button>
                <p className="cr-int-hint" role={on ? "status" : undefined}>{on ? formatSeconds(rec.elapsed) : c.home.speakIn(name)}</p>
                {on
                  ? <button type="button" className="cr-int-link" onClick={cancel}>{t.cancel}</button>
                  : <button type="button" className="cr-int-link" onClick={() => upload(l)} disabled={!open || busy} aria-label={t.uploadIn(name)}><Icon name="upload" size={14} stroke={1.6} />{t.upload}</button>}
              </div>
            );
          })}
          <div className="cr-int-orb" style={{ order: 2 }}><Orb level={level} active={mode !== "rest"} /></div>
        </div>

        {(err || notKept) && (
          <div className="cr-int-notes">
            {err && <p className="cx-error" role="alert">{err}</p>}
            {notKept && <p className="cr-int-note">{ready ? t.notKept : p.notReady[1]}</p>}
          </div>
        )}

        {loading ? <p className="cr-int-wait"><span className="cx-dots" aria-hidden="true"><i /><i /><i /></span></p>
          : count ? (
            <ol className="cr-lanes" aria-live="polite">
              {[...live].reverse().map(x => (
                <li key={x.key} className="cr-lane" data-from={sideOf(x.from)} aria-busy={!x.err}>
                  <SaidPill side={sideOf(x.from)} sound={x.clip.wav} peaks={outline(x.clip.peaks)} seconds={x.clip.seconds} ui={ui} />
                  <span className="cr-lane-way" aria-hidden="true"><Icon name="arrow-long" size={16} stroke={1.5} /></span>
                  <Pill kind="namu" side={sideOf(x.to)} busy={!x.err} label={t.listening} />
                  {x.err && (
                    <p className="cr-lane-err" role="alert">
                      {x.err}
                      <button type="button" className="cr-int-link" onClick={() => void work(x)}>{p.retry}</button>
                      <button type="button" className="cr-int-link" onClick={() => setLive(l => l.filter(y => y.key !== x.key))}>{p.delete}</button>
                    </p>
                  )}
                </li>
              ))}
              {[...turns].reverse().map(x => (
                <li key={x.id} className="cr-lane" data-from={sideOf(x.from)}>
                  <SaidPill side={sideOf(x.from)} sound={x.mine} id={x.id} peaks={x.peaks} seconds={x.seconds} ui={ui} />
                  <span className="cr-lane-way">
                    <Icon name="arrow-long" size={16} stroke={1.5} />
                    {mounted && <time dateTime={x.at}>{formatDate(ui, x.at, { style: "time", zone: "local" })}</time>}
                  </span>
                  <Pill kind="namu" side={sideOf(x.to)} label={now === x.id && voice.on ? p.pause : t.listen} off={!voiceOf(x)}
                    on={now === x.id && voice.on} pos={now === x.id ? voice.pos : 0} busy={making === x.id}
                    peaks={shapes[x.id]?.peaks} seconds={shapes[x.id]?.seconds} onToggle={() => void say(x)}
                    end={voiceOf(x) && <SendIt turn={x} voice={voiceOf(x)!} label={t.share} />} />
                </li>
              ))}
            </ol>
          ) : (
            <div className="cr-int-try">
              {sides.map((l, i) => SAMPLES[l] && voiced(other(l)) && (
                <button key={l} type="button" className="cr-int-sample" data-side={sideOf(l)} style={{ order: i ? 3 : 1 }} onClick={() => void sample(l)} disabled={busy}>
                  <Icon name="play" size={14} stroke={1.6} />{t.sampleIn(language(l).name[ui])}
                </button>
              ))}
              <span className="cr-int-or" style={{ order: 2 }}>{t.tryOne}</span>
            </div>
          )}
        <input ref={file} type="file" accept="audio/*,.m4a,.mp3,.wav,.ogg,.opus,.webm,.flac" hidden
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void run(fileLang.current, f, f.name); }} />
      </section>

      <section className="cr-int-history" aria-labelledby="cr-int-history-h">
        <h2 id="cr-int-history-h">{t.history}</h2>
        <ul className="cr-int-cards">
          <li>
            <button type="button" className="cr-int-card new" onClick={() => show(null)} disabled={!count}>
              <span className="cr-int-plus"><Icon name="plus" size={20} stroke={1.5} /></span>{t.fresh}
            </button>
          </li>
          {ready && list.map(x => (
            <li key={x.id}>
              <button type="button" className="cr-int-card" aria-current={x.id === conv ? "true" : undefined} onClick={() => void pick(x.id)}>
                <VoicePrint turns={x.print} />
                <span className="cr-int-card-when">{mounted ? whenLabel(x.updatedAt, ui) : ""}</span>
                <span className="cr-int-card-count">{t.exchanges(x.count)}</span>
              </button>
              <Forget label={t.remove} sure={t.sure} onYes={() => void remove(x.id)} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** A voice note as a pill: play, its outline (moving as it plays), its length. `off`: nothing to play (a recording
    this browser did not keep), a quiet outline with a microphone where play would be. `busy`: being made. */
function Pill({ kind, side, on = false, pos = 0, busy = false, off = false, peaks, seconds, label, onToggle, end }: {
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
function SaidPill({ side, sound, id, peaks, seconds, ui }: { side: "a" | "b"; sound?: Blob; id?: string; peaks: number[]; seconds: number; ui: Lang }) {
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

/** A conversation drawn as its voices: each turn's outline in its share of the width, the local language above the
    line and French below, so a dialogue looks like one. */
function VoicePrint({ turns }: { turns: PrintTurn[] }) {
  const N = 44, total = turns.reduce((s, x) => s + Math.max(x.seconds, 1), 0) || 1;
  const cols: { side: "a" | "b"; h: number }[] = [];
  turns.forEach((x, i) => {
    const n = i === turns.length - 1 ? N - cols.length : Math.max(2, Math.round((Math.max(x.seconds, 1) / total) * N));
    const take = Math.max(0, Math.min(n, N - cols.length));
    const shape = x.peaks.length ? resample(x.peaks, Math.max(take, 1)) : Array(take).fill(30);
    for (let k = 0; k < take; k++) cols.push({ side: sideOf(x.from), h: Math.max(8, shape[k] ?? 30) });
  });
  return (
    <span className="cr-print" aria-hidden="true">
      {cols.map((x, i) => <i key={i} data-side={x.side} style={{ ["--h" as string]: `${x.h}%` }} />)}
    </span>
  );
}

/** Delete, asked twice: the first press turns the bin into the question, the second deletes. */
function Forget({ label, sure, onYes }: { label: string; sure: string; onYes: () => void }) {
  const [asking, setAsking] = useState(false);
  useEffect(() => { if (!asking) return; const id = window.setTimeout(() => setAsking(false), 4000); return () => clearTimeout(id); }, [asking]);
  return asking
    ? <button key="sure" type="button" className="cr-int-del sure" onClick={onYes} onBlur={() => setAsking(false)} autoFocus>{sure}</button>
    : <button key="ask" type="button" className="cr-int-del" aria-label={label} title={label} onClick={() => setAsking(true)}><Icon name="trash" size={14} stroke={1.6} /></button>;
}

/* Days and times in the reader's own zone, so they appear only once the page runs in the browser. */
const never = () => () => {};
const useMounted = () => useSyncExternalStore(never, () => true, () => false);
/** When a conversation was last used: "Today, 09:54", "Yesterday, 14:10", else the date and time. */
function whenLabel(iso: string, ui: Lang): string {
  const t = createCopy[ui].interpret, d = new Date(iso), now = new Date();
  const time = formatDate(ui, d, { style: "time", zone: "local" });
  if (d.toDateString() === now.toDateString()) return `${t.today}, ${time}`;
  if (d.toDateString() === new Date(now.getTime() - 864e5).toDateString()) return `${t.yesterday}, ${time}`;
  return `${formatDate(ui, d, { style: d.getFullYear() === now.getFullYear() ? "dayMonth" : "day", zone: "local" })}, ${time}`;
}
