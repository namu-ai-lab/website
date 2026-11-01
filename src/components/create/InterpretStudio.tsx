"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { VoiceLine, type LineSide } from "../platform/VoiceLine";
import { resample } from "../platform/media";
import { unlockSound, useRecorder } from "./bits";
import { interpret, interpretations, remember, speak } from "./client";
import { Pill, SaidPill, TurnLane, sideOf, useSayer, type Shown } from "./interpret-turns";
import { interpreterLocals, voiced } from "./interpreter";
import { createCopy } from "@/content/create";
import { TRY_NOTES } from "@/content/ideas";
import { platformCopy } from "@/content/platform";
import { lp, type Lang } from "@/i18n/config";
import { formatSeconds } from "@/i18n/format";
import { b64ToBlob, toClip, type Clip } from "@/lib/audio";
import { WRITTEN, defaultVoice, language, voicesFor, type LangCode } from "@/lib/catalog";
import { PEAKS, type Interpretation, type Turn } from "@/lib/interpretation-shape";
import { LIMITS } from "@/lib/limits";
import { keepRecording } from "@/lib/recordings";

/* The Interpreter: voice in, voice out, and nothing written. Two people face each other across Namu: the local
   language on the left, French on the right, a microphone for each, so nobody chooses a direction, you press the
   side you speak. Between them a voice line: its bars rise with whoever is speaking, above the line for the local
   language (Kola), below it for French (Sahel), and Namu's translation draws the same way as it is said. Under them,
   the latest exchange only, to hear it again; the ones before do not pile up here, they go to the history. Every
   conversation is kept (lib/interpretations keeps the words, never shown, so the voice can be made again; the
   recordings stay in this browser, lib/recordings) and replayed on its own page, /create/interpret/history. */
type Live = { key: string; from: LangCode; to: LangCode; clip: Clip; body: Blob; err?: string };
type Mode = "rest" | "listen" | "think" | "talk";

const UPLOAD = LIMITS.playgroundUploadMb * 1024 * 1024;
const outline = (peaks: number[]) => resample(peaks, PEAKS).map(x => Math.round(x * 100));
/** what to keep of a recording: the original where it is smaller and this browser plays it, else the WAV */
const smallest = (c: Clip) => (c.source.size < c.wav.size && /^audio\/(webm|mp4|mpeg|aac|x-m4a|mp3)/.test(c.source.type) ? c.source : c.wav);
/** Namu's voice notes to try, one in each language */
const SAMPLES: Partial<Record<LangCode, string>> = { ha: TRY_NOTES.find(n => n.id === "clinic")?.audio, fr: "/usecases/translation-fr.m4a" };

export function InterpretStudio({ lang: ui, kitVoices, current, ready }: {
  lang: Lang; kitVoices: Partial<Record<string, string>>; current: Interpretation | null; ready: boolean;
}) {
  const t = createCopy[ui].interpret, c = createCopy[ui], p = platformCopy[ui];
  const locals = interpreterLocals();
  const localOf = (turns: { from: LangCode; to?: LangCode }[]) => turns.map(x => (x.from === WRITTEN ? x.to : x.from)).find((l): l is LangCode => !!l && locals.includes(l));
  const [local] = useState<LangCode>(() => localOf(current?.turns ?? []) ?? locals[0] ?? "ha");
  const sides = [local, WRITTEN] as const, other = (l: LangCode) => (l === WRITTEN ? local : WRITTEN);
  const [turns, setTurns] = useState<Shown[]>(current?.turns ?? []);
  const [live, setLive] = useState<Live[]>([]);
  const [err, setErr] = useState<string | null>(null), [notKept, setNotKept] = useState(!ready);
  const [speaking, setSpeaking] = useState<LangCode | null>(null);
  /* the conversation in view: turns are kept into it one after another, and the first one creates it */
  const session = useRef<{ id: string | null }>({ id: current?.id ?? null });
  const saving = useRef<Promise<void>>(Promise.resolve());
  const file = useRef<HTMLInputElement>(null), said = useRef<LangCode | null>(null), fileLang = useRef<LangCode>(local);

  /* Namu's voice: one player for every translation, so the voice line can follow it */
  const sayer = useSayer(kitVoices, (x, peaks) => { orb.current.peaks = peaks; orb.current.saying = sideOf(x.to); });
  const { voice, now, say } = sayer;

  /* the voice line: whose voice it follows, by what is happening, and on which side of the line */
  const rec = useRecorder(b => { const l = said.current; said.current = null; setSpeaking(null); if (l) void run(l, b, "recording.wav"); },
    () => { said.current = null; setSpeaking(null); setErr(c.errors.mic); });
  const working = live.some(x => !x.err);
  const mode: Mode = speaking ? "listen" : voice.on && now ? "talk" : working ? "think" : "rest";
  const orb = useRef<{ mode: Mode; mic: number; peaks: number[]; at: () => number; speaker: LineSide; saying: LineSide }>(
    { mode: "rest", mic: 0, peaks: [], at: () => 0, speaker: "a", saying: "b" });
  useEffect(() => {
    const o = orb.current;
    o.mode = mode; o.mic = rec.level; o.at = voice.at;
    if (speaking) o.speaker = sideOf(speaking);
  });
  const level = useCallback(() => {
    const o = orb.current;
    if (o.mode === "listen") return o.mic * 1.8;
    if (o.mode === "think") return .12 + .1 * Math.abs(Math.sin(performance.now() / 260));
    if (o.mode === "talk") return o.peaks.length ? o.peaks[Math.min(o.peaks.length - 1, Math.floor(o.at() * o.peaks.length))] * .9 : .4;
    return 0;
  }, []);
  const lineSide = useCallback((): LineSide => {
    const o = orb.current;
    return o.mode === "listen" ? o.speaker : o.mode === "talk" ? o.saying : "both";
  }, []);

  const keepTurn = (turn: Omit<Turn, "at">) => {
    if (!ready) return;
    const s = session.current;
    saving.current = saving.current.then(async () => {
      try {
        const k = await interpretations.add(s.id, turn);
        if (!s.id) {
          s.id = k.id;
          if (session.current === s) history.replaceState(null, "", `${location.pathname}?c=${k.id}`);
        }
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
    sayer.stop(); said.current = l; setSpeaking(l); setErr(null); rec.toggle();
  };
  const cancel = () => { said.current = null; setSpeaking(null); rec.cancel(); };
  const upload = (l: LangCode) => { unlockSound(); fileLang.current = l; file.current?.click(); };
  const sample = async (l: LangCode) => {
    unlockSound();
    const src = SAMPLES[l];
    if (src) try { await run(l, await (await fetch(src)).blob(), src.split("/").pop()!); } catch { setErr(c.errors.network); }
  };

  const fresh = () => {
    sayer.stop(); session.current = { id: null };
    setTurns([]); setLive([]); setErr(null);
    history.replaceState(null, "", location.pathname);
  };

  const count = turns.length + live.length, busy = speaking !== null;
  /* the latest exchange only: one on its way, else the last one kept */
  const latestLive = live[live.length - 1], latest = turns[turns.length - 1];
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
          <div className="cr-int-line" style={{ order: 2 }}><VoiceLine level={level} side={lineSide} active={mode !== "rest"} /></div>
        </div>

        {(err || notKept) && (
          <div className="cr-int-notes">
            {err && <p className="cx-error" role="alert">{err}</p>}
            {notKept && <p className="cr-int-note">{ready ? t.notKept : p.notReady[1]}</p>}
          </div>
        )}

        {latestLive ? (
            <ol className="cr-lanes" aria-live="polite">
              <li key={latestLive.key} className="cr-lane" data-from={sideOf(latestLive.from)} aria-busy={!latestLive.err}>
                <SaidPill side={sideOf(latestLive.from)} sound={latestLive.clip.wav} peaks={outline(latestLive.clip.peaks)} seconds={latestLive.clip.seconds} ui={ui} />
                <span className="cr-lane-way" aria-hidden="true"><Icon name="arrow-long" size={16} stroke={1.5} /></span>
                <Pill kind="namu" side={sideOf(latestLive.to)} busy={!latestLive.err} label={t.listening} />
                {latestLive.err && (
                  <p className="cr-lane-err" role="alert">
                    {latestLive.err}
                    <button type="button" className="cr-int-link" onClick={() => void work(latestLive)}>{p.retry}</button>
                    <button type="button" className="cr-int-link" onClick={() => setLive(l => l.filter(y => y.key !== latestLive.key))}>{p.delete}</button>
                  </p>
                )}
              </li>
            </ol>
          ) : latest ? (
            <ol className="cr-lanes" aria-live="polite"><TurnLane key={latest.id} turn={latest} ui={ui} sayer={sayer} /></ol>
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
      <div className="cr-int-acts">
        <a className="cx-btn sm" href={lp(ui, "/create/interpret/history")}><Icon name="turns" size={16} stroke={1.6} />{t.history}</a>
        <button type="button" className="cx-btn sm" onClick={fresh} disabled={!count}><Icon name="plus" size={16} stroke={1.6} />{t.fresh}</button>
      </div>
    </div>
  );
}
