"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { formatSeconds } from "@/i18n/format";
import { peaksOfBlob, Recorder, toClip, type Clip } from "@/lib/audio";
import { LIMITS } from "@/lib/limits";

/* Sound on the platform, shared by every door: a player with the recording's real waveform, and a way to give the
   platform a recording (speak it, or choose a file). Speaking comes first because many people speak Hausa or Zarma
   better than they write it. Labels come from the caller, so each door keeps its own words. */

export type PlayerLabels = { play: string; pause: string; download: string };

/** A recording (a Blob, or a public file) with its waveform, a playhead you can click, its time and a download. */
export function AudioPlayer({ src, name, labels, peaks: given, compact }: { src: Blob | string; name?: string; labels: PlayerLabels; peaks?: number[]; compact?: boolean }) {
  const [url, setUrl] = useState<string>(typeof src === "string" ? src : "");
  const audio = useRef<HTMLAudioElement>(null);
  const [bars, setBars] = useState<number[]>(given ?? []);
  const [pos, setPos] = useState(0), [dur, setDur] = useState(0), [on, setOn] = useState(false);
  useEffect(() => {
    if (typeof src === "string") { setUrl(src); return; }
    const u = URL.createObjectURL(src); setUrl(u);           // made and released together: a remount never plays a released URL
    return () => URL.revokeObjectURL(u);
  }, [src]);
  useEffect(() => {
    if (given) return;
    let live = true;
    (typeof src === "string" ? fetch(src).then(r => r.blob()) : Promise.resolve(src)).then(peaksOfBlob)
      .then(p => { if (live) setBars(p); }).catch(() => { if (live) setBars([]); });
    return () => { live = false; };
  }, [src, given]);
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const tick = () => { if (audio.current) setPos(audio.current.currentTime); raf = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [on]);
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audio.current; if (!a || !dur) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = Math.max(0, Math.min(dur, ((e.clientX - r.left) / r.width) * dur)); setPos(a.currentTime);
  };
  const share = dur ? pos / dur : 0;
  const n = compact ? 48 : 80;
  const shown = bars.length ? resample(bars, n) : Array.from({ length: n }, () => 0.08);
  return (
    <div className={`cx-player pf-player${compact ? " compact" : ""}`}>
      <audio ref={audio} src={url || undefined} preload="metadata" onLoadedMetadata={e => setDur(e.currentTarget.duration)}
        onPlay={() => setOn(true)} onPause={() => setOn(false)} onEnded={() => { setOn(false); setPos(0); }} />
      <button type="button" className="cx-play" aria-label={on ? labels.pause : labels.play} onClick={() => (on ? audio.current?.pause() : void audio.current?.play())}>
        <Icon name={on ? "pause" : "play"} size={18} stroke={1.6} />
      </button>
      <div className="cx-wave" onClick={seek} role="presentation">
        {shown.map((b, i) => <i key={i} className={i / shown.length < share ? "on" : undefined} style={{ height: `${Math.max(6, b * 100)}%` }} />)}
      </div>
      {!compact && <span className="cx-time">{formatSeconds(pos)} / {formatSeconds(dur)}</span>}
      {name && url && <a className="cx-icon-btn" href={url} download={name} aria-label={labels.download} title={labels.download}><Icon name="download" size={17} stroke={1.6} /></a>}
    </div>
  );
}

export function resample(xs: number[], n: number): number[] {
  if (xs.length === n) return xs;
  return Array.from({ length: n }, (_, i) => {
    const a = Math.floor((i / n) * xs.length), b = Math.max(a + 1, Math.floor(((i + 1) / n) * xs.length));
    return Math.max(...xs.slice(a, b));
  });
}

export type RecordLabels = { record: string; stop: string; upload: string; recording: (t: string) => string; mic: string; decode: string; long: (min: number) => string };

/** Speak or choose a file; hands back a Clip (16 kHz WAV plus the original). Up to `maxMinutes` (the API's limit). */
export function RecordInput({ onClip, labels, maxMinutes = LIMITS.audioMinutes, accept = "audio/*,.m4a,.mp3,.wav,.ogg,.opus,.webm,.flac", disabled, big }:
  { onClip: (c: Clip) => void; labels: RecordLabels; maxMinutes?: number; accept?: string; disabled?: boolean; big?: boolean }) {
  const rec = useRef<Recorder | null>(null), file = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false), [elapsed, setElapsed] = useState(0), [level, setLevel] = useState(0);
  const [err, setErr] = useState<string | null>(null), [reading, setReading] = useState(false);
  useEffect(() => {
    if (!recording) return;
    const t0 = Date.now();
    const id = window.setInterval(() => { setElapsed((Date.now() - t0) / 1000); setLevel(rec.current?.level ?? 0); }, 80);
    return () => clearInterval(id);
  }, [recording]);
  useEffect(() => () => { void rec.current?.stop(); }, []);

  const take = async (blob: Blob, name: string) => {
    setReading(true); setErr(null);
    try {
      const c = await toClip(blob, name);
      if (c.seconds > maxMinutes * 60) { setErr(labels.long(maxMinutes)); return; }
      onClip(c);
    } catch { setErr(labels.decode); } finally { setReading(false); }
  };
  const start = async () => {
    if (rec.current) return;
    setErr(null);
    const r = (rec.current = new Recorder());
    try { await r.start(maxMinutes * 60, () => void stop()); }
    catch { if (rec.current === r) rec.current = null; setErr(labels.mic); return; }
    if (rec.current !== r) return;
    setElapsed(0); setRecording(true);
  };
  const stop = async () => {
    const r = rec.current; rec.current = null; setRecording(false);
    if (r) await take(await r.stop(), "recording.wav");
  };

  return (
    <div className={`pf-record${big ? " big" : ""}`}>
      {recording ? (
        <div className="pf-recording" role="status">
          <span className="pf-level" aria-hidden="true">{[0.5, 0.8, 1, 0.8, 0.5].map((k, i) => <i key={i} style={{ transform: `scaleY(${0.15 + Math.min(1, level * k * 1.6)})` }} />)}</span>
          <span>{labels.recording(formatSeconds(elapsed))}</span>
          <button type="button" className="cx-btn primary" onClick={() => void stop()}><Icon name="stop" size={14} stroke={1.6} />{labels.stop}</button>
        </div>
      ) : (
        <div className="pf-record-acts">
          <button type="button" className={`cx-btn primary${big ? "" : " sm"}`} onClick={() => void start()} disabled={disabled || reading}>
            <Icon name="microphone" size={16} stroke={1.6} />{labels.record}
          </button>
          <button type="button" className={`cx-btn${big ? "" : " sm"}`} onClick={() => file.current?.click()} disabled={disabled || reading}>
            <Icon name="upload" size={16} stroke={1.6} />{labels.upload}
          </button>
          <input ref={file} type="file" accept={accept} hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void take(f, f.name); }} />
        </div>
      )}
      {err && <p className="cx-error" role="alert">{err}</p>}
    </div>
  );
}
