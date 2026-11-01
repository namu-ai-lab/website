"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../Icon";
import { VoicePicker } from "../platform/pickers";
import { interpret, kitVoices, save, speak } from "./client";
import { platformCopy } from "@/content/platform";
import { projectsCopy } from "@/content/projects";
import type { Lang } from "@/i18n/config";
import { formatSeconds } from "@/i18n/format";
import { encodeWav } from "@/lib/audio";
import { render } from "@/lib/audio-out";
import { LANGUAGES, LOCAL, OUTPUTS, can, canTranslate, defaultVoice, language, type LangCode, type OutputId, type VoiceId } from "@/lib/catalog";
import { LIMITS } from "@/lib/limits";
import { fileName } from "@/lib/project-shape";
import { placeClips, splitSegments, toSrt } from "@/lib/segments";

type Row = { start: number; end: number; sourceText: string; text: string; state: "wait" | "work" | "done" | "error"; at?: number; dur?: number };
const RATE = 16000;

/* Translate a video, in the browser: its sound is read and split at the silences between phrases; each phrase is
   heard and put into the other language, then said again in the chosen voice, at the moment it was said (or straight
   after the previous phrase if that one runs long). The video then plays with its new sound in step, and the sound
   and subtitles in both languages can be saved. Nothing is uploaded but each phrase's sound, one at a time. */
export function VideoTranslator({ lang }: { lang: Lang }) {
  const t = projectsCopy[lang].video, e = projectsCopy[lang].editor, p = platformCopy[lang];
  const pairs = useMemo(() => LANGUAGES.map(l => l.code).flatMap(f => LOCAL.filter(to => to !== f && canTranslate(f, to) && can("speech", to)).map(to => [f, to] as const)), []);
  const froms = [...new Set(pairs.map(([f]) => f))];
  const [from, setFrom] = useState<LangCode>(froms[0] ?? "fr");
  const tos = pairs.filter(([f]) => f === from).map(([, to]) => to);
  const [to, setTo] = useState<LangCode>(tos[0] ?? "ha");
  const [kit, setKit] = useState<Partial<Record<string, string>>>({});
  const [voice, setVoice] = useState<VoiceId | null>(null);
  const [file, setFile] = useState<File | null>(null), [url, setUrl] = useState("");
  const [rows, setRows] = useState<Row[]>([]), [phase, setPhase] = useState<"idle" | "work" | "done">("idle");
  const [track, setTrack] = useState<Blob | null>(null), [trackUrl, setTrackUrl] = useState("");
  const [sound, setSound] = useState<"translated" | "original">("translated");
  const [madeFor, setMadeFor] = useState<OutputId>("file");
  const [err, setErr] = useState<string | null>(null);
  const stop = useRef(false), media = useRef<HTMLVideoElement & HTMLAudioElement>(null), dub = useRef<HTMLAudioElement>(null), input = useRef<HTMLInputElement>(null);

  useEffect(() => { void kitVoices().then(setKit); }, []);
  useEffect(() => { if (!file) return; const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);
  useEffect(() => { if (!track) return; const u = URL.createObjectURL(track); setTrackUrl(u); return () => URL.revokeObjectURL(u); }, [track]);
  useEffect(() => () => { stop.current = true; }, []);
  const chosenVoice = voice ?? defaultVoice(to, kit);
  const isVideo = !!file && file.type.startsWith("video");

  const pick = (f: File) => { stop.current = true; setFile(f); setRows([]); setTrack(null); setPhase("idle"); setErr(null); setSound("translated"); };
  const patch = (i: number, r: Partial<Row>) => setRows(rs => rs.map((x, j) => (j === i ? { ...x, ...r } : x)));

  const run = async () => {
    if (!file) return;
    stop.current = false; setPhase("work"); setErr(null); setTrack(null);
    let source: AudioBuffer;
    const ctx = new AudioContext();
    try { source = await ctx.decodeAudioData(await file.arrayBuffer()); }
    catch { setErr(t.decode); setPhase("idle"); return; }
    finally { void ctx.close(); }
    if (source.duration > LIMITS.audioMinutes * 60) { setErr(t.tooLong(LIMITS.audioMinutes)); setPhase("idle"); return; }
    const off = new OfflineAudioContext(1, Math.ceil(source.duration * RATE), RATE), node = off.createBufferSource();
    node.buffer = source; node.connect(off.destination); node.start();
    const pcm = (await off.startRendering()).getChannelData(0);
    const segs = splitSegments(pcm, RATE);
    if (!segs.length) { setErr(t.noSpeech); setPhase("idle"); return; }
    const list: Row[] = segs.map(s => ({ ...s, sourceText: "", text: "", state: "wait" }));
    setRows(list);

    const clips: (AudioBuffer | null)[] = [];
    const dec = new AudioContext();
    try {
      for (let i = 0; i < segs.length; i++) {
        if (stop.current) { setErr(t.stopped); break; }
        patch(i, { state: "work" });
        try {
          const wav = encodeWav(pcm.subarray(Math.floor(segs[i].start * RATE), Math.ceil(segs[i].end * RATE)), RATE);
          const heard = await interpret(wav, from, to);
          list[i] = { ...list[i], sourceText: heard.sourceText, text: heard.text };
          patch(i, { sourceText: heard.sourceText, text: heard.text });
          clips[i] = heard.text.trim() ? await dec.decodeAudioData(await (await speak(heard.text, to, chosenVoice)).arrayBuffer()) : null;
          patch(i, { state: "done" });
        } catch (x) {
          patch(i, { state: "error" }); setErr(x instanceof Error ? x.message : p.errors.generic); break;
        }
      }
    } finally { void dec.close(); }

    const durs = segs.map((_, i) => clips[i]?.duration ?? 0);
    const starts = placeClips(segs, durs);
    const rate = clips.find(Boolean)?.sampleRate ?? 24000;
    const total = Math.max(source.duration, ...starts.map((s, i) => s + durs[i]));
    const mix = new OfflineAudioContext(1, Math.max(1, Math.ceil(total * rate)), rate);
    clips.forEach((c, i) => { if (!c) return; const n = mix.createBufferSource(); n.buffer = c; n.connect(mix.destination); n.start(starts[i]); });
    const out = await mix.startRendering();
    setRows(rs => rs.map((r, i) => ({ ...r, at: starts[i], dur: durs[i] })));
    setTrack(encodeWav(out.getChannelData(0), rate));
    setPhase("done");
  };

  /* the new sound follows the picture: it starts, stops and jumps with it */
  const sync = (play?: boolean) => {
    const m = media.current, a = dub.current;
    if (!m || !a || sound !== "translated" || !trackUrl) return;
    a.currentTime = m.currentTime;
    if (play === true) void a.play().catch(() => {}); else if (play === false) a.pause();
  };

  const base = file ? file.name.replace(/\.[^.]+$/, "") : "namu";
  const saveTrack = async () => { if (!track) return; const r = await render(track, madeFor); save(r.blob, fileName(base, language(to).endonym, r.ext)); };
  const saveSrt = (which: "from" | "to") => {
    const cues = rows.map(r => which === "from" ? { start: r.start, end: r.end, text: r.sourceText } : { start: r.at ?? r.start, end: (r.at ?? r.start) + (r.dur || r.end - r.start), text: r.text });
    save(new Blob([toSrt(cues)], { type: "application/x-subrip" }), fileName(base, language(which === "from" ? from : to).endonym, "srt"));
  };
  const done = rows.filter(r => r.state === "done").length;

  if (!file) return (
    <div className="pj-video-empty">
      <button type="button" className="pj-drop" onClick={() => input.current?.click()}>
        <span className="pj-tile lg"><Icon name="demo" size={26} stroke={1.4} /></span>
        <span>{t.choose}</span>
      </button>
      <input ref={input} type="file" accept="video/*,audio/*" hidden onChange={ev => { const f = ev.target.files?.[0]; ev.target.value = ""; if (f) pick(f); }} />
    </div>
  );

  return (
    <div className="pj-video">
      <div className="pj-stage">
        {isVideo
          ? <video ref={media} src={url || undefined} controls playsInline muted={sound === "translated" && !!trackUrl} onPlay={() => sync(true)} onPause={() => sync(false)} onSeeked={() => sync()} onEnded={() => sync(false)} />
          : <audio ref={media} src={url || undefined} controls muted={sound === "translated" && !!trackUrl} onPlay={() => sync(true)} onPause={() => sync(false)} onSeeked={() => sync()} onEnded={() => sync(false)} />}
        {trackUrl && <audio ref={dub} src={trackUrl} preload="auto" />}
      </div>

      <div className="pj-video-bar">
        <label className="pj-select"><span className="pj-select-label">{t.from}</span>
          <select value={from} onChange={ev => { const f = ev.target.value as LangCode; setFrom(f); setTo(pairs.find(([x]) => x === f)?.[1] ?? to); setVoice(null); }} disabled={phase === "work"}>{froms.map(l => <option key={l} value={l}>{language(l).endonym}</option>)}</select>
          <Icon name="chevron" size={14} stroke={1.6} />
        </label>
        <Icon name="arrow-long" size={18} stroke={1.5} className="pj-arrow" />
        <label className="pj-select"><span className="pj-select-label">{t.to}</span>
          <select value={to} onChange={ev => { setTo(ev.target.value as LangCode); setVoice(null); }} disabled={phase === "work"}>{tos.map(l => <option key={l} value={l}>{language(l).endonym}</option>)}</select>
          <Icon name="chevron" size={14} stroke={1.6} />
        </label>
        <div className="pj-video-voice"><VoicePicker lang={to} value={chosenVoice} onPick={setVoice} label={p.voice} playLabel={p.play} /></div>
        <span className="pj-grow" />
        {phase === "work"
          ? <button type="button" className="cx-btn" onClick={() => { stop.current = true; }}><Icon name="stop" size={14} stroke={1.6} />{p.stop}</button>
          : <button type="button" className="cx-btn primary" onClick={() => void run()} disabled={!pairs.length}><Icon name="translate" size={16} stroke={1.6} />{t.translate}</button>}
        <button type="button" className="cx-btn" onClick={() => input.current?.click()} disabled={phase === "work"}>{t.another}</button>
        <input ref={input} type="file" accept="video/*,audio/*" hidden onChange={ev => { const f = ev.target.files?.[0]; ev.target.value = ""; if (f) pick(f); }} />
      </div>

      {phase === "work" && rows.length > 0 && (
        <div className="pj-progress" role="status"><div className="cx-meter"><i style={{ width: `${(done / rows.length) * 100}%` }} /></div><span>{t.step(Math.min(done + 1, rows.length), rows.length)}</span></div>
      )}
      {err && <p className="cx-error" role="alert">{err}</p>}

      {phase === "done" && track && (
        <div className="pj-video-out">
          <div className="pj-seg" role="radiogroup" aria-label={t.translated}>
            {(["translated", "original"] as const).map(k => (
              <button key={k} type="button" role="radio" aria-checked={sound === k} onClick={() => { setSound(k); dub.current?.pause(); }}>{t[k]}</button>
            ))}
          </div>
          <span className="pj-grow" />
          <label className="pj-select"><span className="pj-select-label">{e.madeFor}</span>
            <select value={madeFor} onChange={ev => setMadeFor(ev.target.value as OutputId)}>{OUTPUTS.map(o => <option key={o.id} value={o.id}>{p.outputs[o.id]}</option>)}</select>
            <Icon name="chevron" size={14} stroke={1.6} />
          </label>
          <button type="button" className="cx-btn sm primary" onClick={() => void saveTrack()}><Icon name="download" size={15} stroke={1.6} />{t.track}</button>
          <button type="button" className="cx-btn sm" onClick={() => saveSrt("to")}><Icon name="download" size={15} stroke={1.6} />{t.subtitles(language(to).endonym)}</button>
          <button type="button" className="cx-btn sm" onClick={() => saveSrt("from")}><Icon name="download" size={15} stroke={1.6} />{t.subtitles(language(from).endonym)}</button>
        </div>
      )}

      {rows.length > 0 && (
        <ol className="pj-lines">
          {rows.map((r, i) => (
            <li key={i} className={r.state}>
              <button type="button" className="pj-time" onClick={() => { if (media.current) { media.current.currentTime = r.start; sync(); } }}>{formatSeconds(r.start)}</button>
              <p lang={from}>{r.sourceText || (r.state === "work" ? t.listening : "")}</p>
              <p lang={to}>{r.text}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
