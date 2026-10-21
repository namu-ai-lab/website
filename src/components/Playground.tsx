"use client";

/* The home page console: try every one of the Lab's models, after elevenlabs.io's hero panel. Four tabs across the
   top; each puts one object in the middle (the voice reel over a card, a listening orb, Aïr on a call, a code window)
   over the same bar: the choices in the middle, the way in on the right.
     Speak & listen   one card, both ways: Tafiya reads what you write, live (/api/demo/speech), the words lighting up
                      as they are said; Tatsuniya writes down what you say, upload or pick (/api/demo/transcribe); and
                      Tafiya can say back what Tatsuniya heard. The examples play recordings at once.
     Translate        Kora answers Hausa in French or French in Hausa, in writing and aloud (/api/demo/translate)
     Converse         a live call with Aïr, a research preview (lib/call, /api/demo/converse)
     API              the code, run on the demo
   The browser never holds a key: /api/demo adds the server-held demo key, and the gateway caps the demo at 300
   characters and 15 seconds of audio and limits each visitor. Tabs follow the WAI-ARIA tabs pattern. */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "./Icon";
import { AgentOrb, VoiceReel } from "./VoiceReel";
import { koraPalette, playground, samples, scripts, voices, type PlaygroundCopy, type Sample, type Tab } from "@/content/playground";
import { lp, type Lang } from "@/i18n/config";
import { apiBase } from "@/lib/env";
import { AirCall, TAP, wav16k, type CallState, type Persona } from "@/lib/call";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const MAX_TEXT = 300;             // the gateway's demo cap on text
const MAX_CLIP_MS = 14800;        // just under the gateway's 15-second demo cap on audio

/* Runs `tick(elapsedMs)` every frame while `on`; stops when tick returns false. */
function useTicker(on: boolean, tick: (ms: number) => boolean | void) {
  const ref = useRef(tick); ref.current = tick;
  useEffect(() => {
    if (!on) return;
    let raf = 0; const t0 = performance.now();
    const step = (now: number) => { if (ref.current(now - t0) === false) return; raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [on]);
}

/* ---------------------------------------------------------------- the live demo */
class DemoError extends Error {
  constructor(readonly status: number, readonly type = "") { super(type || String(status)); }
}
/** POST to /api/demo/<path>; a failure carries the gateway's status and error type. */
async function demo(path: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
  const res = await fetch(`/api/demo/${path}`, { method: "POST", ...init, signal });
  if (!res.ok) {
    const j = await res.json().catch(() => null) as { error?: { type?: string } } | null;
    throw new DemoError(res.status, j?.error?.type ?? "");
  }
  return res;
}
/** The failure, in words: the demo's limits by name, the rest as plainly as possible. */
function demoMessage(e: unknown, c: PlaygroundCopy, kind: "text" | "audio" = "text"): string {
  if (!(e instanceof DemoError)) return c.live.failed;
  if (e.status === 429) return c.live.limited;
  if (e.type === "text_too_long") return c.tts.limit;
  if (e.type === "audio_too_long") return c.listen.tooLong;
  if (e.type === "empty_audio") return c.listen.unheard;
  if (e.status === 400 && kind === "audio") return c.listen.badFile;
  if (e.status === 503 || e.status === 404) return c.live.unavailable;
  return c.live.failed;
}
async function speech(text: string, voice: string): Promise<{ blob: Blob; seconds: string }> {
  const res = await demo("speech", { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voice }) });
  return { blob: await res.blob(), seconds: res.headers.get("x-audio-seconds") ?? "" };
}

/* Each example was spoken by Tafiya through the API beforehand (public/demo/<script>-<voice>.m4a, the best of five takes)
   and plays at once: the example is heard the moment it is picked, with no wait for a sleeping model, and it is the
   model's real output. Text the visitor types or edits is always generated live. */
async function recorded(script: string, voice: string): Promise<Blob | null> {
  try { const r = await fetch(`/demo/${script}-${voice}.m4a`); return r.ok ? await r.blob() : null; } catch { return null; }
}

/** True once a request has been waiting long enough that the model is probably waking up. */
function useWaking(busy: boolean, after = 4000) {
  const [waking, setWaking] = useState(false);
  useEffect(() => {
    setWaking(false);
    if (!busy) return;
    const id = window.setTimeout(() => setWaking(true), after);
    return () => window.clearTimeout(id);
  }, [busy, after]);
  return waking;
}

/* Plays a clip and writes its loudness into `amp` each frame, so the orb moves with the real voice. */
function usePlayer(amp: { current: number }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const buf = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const url = useRef<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const ensure = () => {
    if (audio.current) return audio.current;
    const a = new Audio();
    a.onended = a.onpause = () => { setPlaying(false); amp.current = 0; };
    a.onplay = () => setPlaying(true);
    try {
      const ctx = new AudioContext(), node = ctx.createAnalyser(); node.fftSize = 512;
      ctx.createMediaElementSource(a).connect(node); node.connect(ctx.destination);
      analyser.current = node;
      a.addEventListener("play", () => { void ctx.resume(); });
    } catch { /* no Web Audio: the orb stays still, the sound still plays */ }
    return (audio.current = a);
  };
  useTicker(playing, () => {
    const node = analyser.current;
    if (!node || reduced()) { amp.current = 0; return; }
    buf.current ??= new Uint8Array(new ArrayBuffer(node.fftSize));
    node.getByteTimeDomainData(buf.current);
    let sum = 0; for (const v of buf.current) sum += ((v - 128) / 128) ** 2;
    amp.current = Math.min(1, Math.sqrt(sum / buf.current.length) * 4);
  });
  const play = (blob: Blob) => {
    const a = ensure();
    if (url.current) URL.revokeObjectURL(url.current);
    a.src = url.current = URL.createObjectURL(blob);
    void a.play();
  };
  const stop = () => { audio.current?.pause(); amp.current = 0; };
  useEffect(() => () => { audio.current?.pause(); if (url.current) URL.revokeObjectURL(url.current); }, []);
  const at = () => audio.current?.currentTime ?? 0;      // where playback is, for the read-along
  return { play, stop, playing, at };
}

/* An object URL for the last clip, freed when it changes or the tab closes: what the download link points at. */
function useClipUrl() {
  const [clip, setClip] = useState<{ url: string; name: string } | null>(null);
  const last = useRef<string | null>(null);
  const keep = (blob: Blob, name: string) => {
    if (last.current) URL.revokeObjectURL(last.current);
    const url = (last.current = URL.createObjectURL(blob));
    setClip({ url, name });
  };
  useEffect(() => () => { if (last.current) URL.revokeObjectURL(last.current); }, []);
  return [clip, keep] as const;
}

/* The microphone, through the same worklet as a call with Aïr (lib/call): loudness into `amp` for the orb, the seconds
   left for the countdown, and 16 kHz WAV handed to `onClip` when the visitor stops or 15 seconds run out. */
function useRecorder(amp: { current: number }, onClip: (wav: ArrayBuffer) => void) {
  type Take = { ctx: AudioContext; stream: MediaStream; node: AudioWorkletNode; chunks: Float32Array[]; n: number };
  const take = useRef<Take | null>(null);
  const done = useRef(onClip); done.current = onClip;
  const [left, setLeft] = useState<number | null>(null);
  const finish = (send: boolean) => {
    const s = take.current;
    if (!s) return;
    take.current = null;
    s.node.port.onmessage = null; s.node.disconnect(); s.stream.getTracks().forEach(t => t.stop());
    const rate = s.ctx.sampleRate; void s.ctx.close();
    amp.current = 0; setLeft(null);
    if (send && s.n > rate * 0.4) done.current(wav16k(s.chunks, rate));     // under 0.4 s is a stray tap, not speech
  };
  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    const ctx = new AudioContext();
    try {
      await ctx.resume().catch(() => {});          // iOS pauses the context while it switches to the microphone
      await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([TAP], { type: "application/javascript" })));
      const node = new AudioWorkletNode(ctx, "namu-tap"), mute = ctx.createGain(); mute.gain.value = 0;
      ctx.createMediaStreamSource(stream).connect(node); node.connect(mute); mute.connect(ctx.destination);
      const s: Take = { ctx, stream, node, chunks: [], n: 0 }, max = (ctx.sampleRate * MAX_CLIP_MS) / 1000;
      take.current = s;
      node.port.onmessage = (e: MessageEvent<Float32Array>) => {
        const x = e.data; s.chunks.push(x); s.n += x.length;
        let sum = 0; for (const v of x) sum += v * v;
        amp.current = reduced() ? 0 : Math.min(1, Math.sqrt(sum / x.length) * 6);
        setLeft(Math.max(0, Math.ceil((max - s.n) / ctx.sampleRate)));
        if (s.n >= max) finish(true);
      };
      setLeft(Math.round(MAX_CLIP_MS / 1000));
    } catch (e) { stream.getTracks().forEach(t => t.stop()); void ctx.close(); throw e; }
  };
  useEffect(() => () => finish(false), []);
  return { start, stop: () => finish(true), cancel: () => finish(false), recording: left !== null, left: left ?? 0 };
}

/* An uploaded clip as 16 kHz mono WAV, cut to the demo's 15 seconds: any format the browser can decode goes in. */
async function asClip(file: Blob): Promise<{ wav: ArrayBuffer; cut: boolean }> {
  const ctx = new AudioContext();
  try {
    const buf = await ctx.decodeAudioData(await file.arrayBuffer());
    const n = Math.min(buf.length, Math.floor((buf.sampleRate * MAX_CLIP_MS) / 1000)), mono = new Float32Array(n);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++) mono[i] += d[i] / buf.numberOfChannels;
    }
    return { wav: wav16k([mono], buf.sampleRate), cut: buf.length > n };
  } finally { void ctx.close(); }
}
const b64Blob = (b64: string, type = "audio/wav") => new Blob([Uint8Array.from(atob(b64), ch => ch.charCodeAt(0))], { type });

/* ---------------------------------------------------------------- the bar under every tab */
type Cta = { label: string; href: string };

function Bar({ cta, lead, children }: { cta: Cta; lead?: ReactNode; children?: ReactNode }) {
  return (
    <div className="pg-bar">
      {lead ? <div className="pg-bar-l">{lead}</div> : <span aria-hidden="true" />}
      <div className="pg-bar-c">{children}</div>
      <a className="pg-cta" href={cta.href}>{cta.label}</a>
    </div>
  );
}

function Pills<T extends string>({ items, value, onPick, label, disabled, extra }:
  { items: { id: T; label: string }[]; value: T | null; onPick: (id: T) => void; label: string; disabled?: boolean; extra?: ReactNode }) {
  return (
    <div className="pg-pills" role="group" aria-label={label}>
      {items.map(x => <button key={x.id} type="button" aria-pressed={x.id === value} disabled={disabled} onClick={() => onPick(x.id)}>{x.label}</button>)}
      {extra}
    </div>
  );
}

function CopyButton({ text, labels }: { text: string; labels: { copy: string; copied: string } }) {
  const [done, setDone] = useState(false);
  useEffect(() => { setDone(false); }, [text]);
  return (
    <button type="button" className="pg-mini" onClick={() => { void navigator.clipboard?.writeText(text).then(() => setDone(true)); }}>
      <Icon name={done ? "check" : "copy"} size={15} stroke={1.6} />{done ? labels.copied : labels.copy}
    </button>
  );
}

/* ---------------------------------------------------------------- Speak & listen (Tafiya and Tatsuniya) */
/* One card, both ways. Write Hausa and Tafiya reads it, the words lighting up as the voice reaches them; press the
   microphone (or send a sample or a clip) and Tatsuniya writes down what it heard, word by word; then "Hear it back":
   Tafiya says what Tatsuniya wrote, the two models handing the sentence to each other. The chosen voice's orb moves
   with whoever is speaking: Tafiya, or the visitor while the microphone is open. */
type Origin = "example" | "typed" | "heard" | "echoed";
type Timed = { start: number; end: number };

/* When each word is said, approximately: the clip's 20 ms frames that carry voice (louder than an eighth of its
   peak), shared out among the words in proportion to their length. Good enough to follow by eye, and the page says
   so; the model gives no word timings of its own. */
async function timeWords(blob: Blob, words: string[]): Promise<Timed[] | null> {
  if (!words.length) return null;
  const ctx = new AudioContext();
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const d = buf.getChannelData(0), hop = Math.max(1, Math.round(buf.sampleRate * 0.02)), n = Math.floor(d.length / hop);
    const rms = new Float32Array(n);
    let top = 0;
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = i * hop; j < (i + 1) * hop; j++) s += d[j] * d[j];
      rms[i] = Math.sqrt(s / hop); top = Math.max(top, rms[i]);
    }
    const voiced: number[] = [];
    for (let i = 0; i < n; i++) if (rms[i] > top * 0.125) voiced.push(i);
    if (!voiced.length) return null;
    const weight = words.map(w => w.length + 1), total = weight.reduce((a, b) => a + b, 0);
    let acc = 0;
    return words.map((_, k) => {
      const a = Math.min(voiced.length - 1, Math.floor((acc / total) * voiced.length));
      acc += weight[k];
      const b = Math.min(voiced.length - 1, Math.max(a, Math.ceil((acc / total) * voiced.length) - 1));
      return { start: voiced[a] * 0.02, end: (voiced[b] + 1) * 0.02 };
    });
  } catch { return null; } finally { void ctx.close(); }
}

/* the text as words and the spaces between them, so a read-along keeps the visitor's own line breaks */
const split = (text: string) => text.split(/(\s+)/);
const wordsOf = (text: string) => text.split(/\s+/).filter(Boolean);

function SpeakListen({ lang, cta }: { lang: Lang; cta: Cta }) {
  const c = playground[lang], t = c.tts, l = c.listen, v = c.speak, ss = scripts[lang], vs = voices[lang], list = samples[lang].stt;
  const [text, setText] = useState(ss[0].text);
  const [origin, setOrigin] = useState<Origin>("example");
  const [heardS, setHeardS] = useState(0);
  const [vi, setVi] = useState(0);
  const [busy, setBusy] = useState<null | "speak" | "listen">(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [timing, setTiming] = useState<Timed[] | null>(null);   // the clip now playing, word by word
  const [now, setNow] = useState(-1);                            // the word being said
  const [typing, setTyping] = useState(false);                   // a transcript arriving, word by word
  const [clip, keepClip] = useClipUrl();
  const amp = useRef(0);
  const player = usePlayer(amp);
  const cache = useRef(new Map<string, Blob>());                 // each voice and text is generated once per visit
  const box = useRef<HTMLTextAreaElement>(null);
  const abort = useRef<AbortController | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const waking = useWaking(busy !== null);
  const rec = useRecorder(amp, wav => { void transcribe(wav); });
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {                                              // the box is as tall as its text, no taller
    const el = box.current;
    if (!el) return;
    el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`;
  }, [text, typing, player.playing]);

  const reading = player.playing && timing !== null;
  useTicker(reading, () => {
    if (!timing) return false;
    const at = player.at();
    let k = -1;
    for (let i = 0; i < timing.length; i++) if (timing[i].start <= at) k = i;
    setNow(x => (x === k ? x : k));
  });
  useEffect(() => { if (!player.playing) setNow(-1); }, [player.playing]);

  const example = origin === "example" ? ss.find(s => s.text === text.trim()) ?? null : null;
  const fromTatsuniya = origin === "heard" || origin === "echoed";

  async function speak() {
    if (player.playing) { player.stop(); return; }
    if (busy || rec.recording) return;
    const body = text.trim();
    if (!body) { setError(t.empty); return; }
    const voice = vs[vi].id, k = `${voice}\n${body}`;
    setError(null); setNote(null); setTyping(false);
    let blob = cache.current.get(k);
    if (!blob) {
      setBusy("speak");
      try { blob = (example && await recorded(example.id, voice)) || (await speech(body, voice)).blob; cache.current.set(k, blob); }
      catch (e) { setError(demoMessage(e, c, "text")); return; }
      finally { setBusy(null); }
    }
    setTiming(await timeWords(blob, wordsOf(body)));
    keepClip(blob, blob.type.includes("mp4") || blob.type.includes("m4a") ? `tafiya-${voice}-${example?.id ?? "clip"}.m4a` : `tafiya-${voice}.wav`);
    if (origin === "heard") setOrigin("echoed");
    player.play(blob);
  }

  async function transcribe(audio: Blob | ArrayBuffer) {
    abort.current?.abort();
    const ac = (abort.current = new AbortController());
    setBusy("listen"); setError(null);
    try {
      const res = await demo("transcribe", { headers: { "Content-Type": "application/octet-stream" }, body: audio }, ac.signal);
      const j = await res.json() as { text?: string; audio_seconds?: number };
      const said = (j.text ?? "").trim();
      if (!said) { setError(l.unheard); return; }
      setText(said); setOrigin("heard"); setHeardS(j.audio_seconds ?? 0); setTiming(null);
      if (!reduced()) {                                          // the words arrive one after another, then the box is editable again
        setTyping(true);
        window.setTimeout(() => setTyping(false), wordsOf(said).length * 70 + 600);
      }
    } catch (e) {
      if (!ac.signal.aborted) setError(demoMessage(e, c, "audio"));
    } finally {
      if (abort.current === ac) setBusy(null);
    }
  }

  async function record() {
    if (rec.recording) { rec.stop(); return; }
    if (busy) return;
    player.stop(); setError(null); setNote(null); setPicked(null); setTyping(false);
    try { await rec.start(); } catch { setError(l.mic); }
  }
  async function sample(s: Sample) {
    rec.cancel(); setError(null); setNote(null); setPicked(s.id); setTiming(null);
    try {
      const blob = await (await fetch(s.src)).blob();
      player.play(blob);                                         // heard as it is sent: the visitor hears what Tatsuniya hears
      await transcribe(blob);
    } catch { setError(c.live.failed); }
  }
  async function upload(f: File) {
    rec.cancel(); player.stop(); setError(null); setNote(null); setPicked(null);
    try {
      const { wav, cut } = await asClip(f);
      if (cut) setNote(l.trimmed);
      await transcribe(wav);
    } catch { setError(l.badFile); }
  }
  const pickExample = (id: string) => {
    player.stop(); rec.cancel(); setError(null); setNote(null); setPicked(null); setTyping(false); setTiming(null);
    setText(ss.find(s => s.id === id)?.text ?? ""); setOrigin("example");
  };

  const tag = example ? t.example : origin === "heard" ? v.heardBy(heardS.toFixed(1)) : origin === "echoed" ? v.echoed : t.live;
  const status = error ?? (rec.recording ? " "                  // the countdown is on the card; read out each second, it would chatter
    : busy === "listen" ? (waking ? c.live.waking : l.transcribing)
    : busy === "speak" ? (waking ? c.live.waking : c.live.working)
    : reading ? v.approx : note ?? v.idle);
  const parts = split(text);
  let w = -1;

  return (
    <>
      <div className="pg-stage pg-sl">
        <VoiceReel voices={vs} index={vi} onIndex={i => { player.stop(); setVi(i); }} playing={player.playing || rec.recording}
          onPlay={rec.recording ? () => rec.stop() : speak} amp={amp}
          labels={{ play: t.play, stop: rec.recording ? v.micStop : t.stop, previous: t.previous, next: t.next, voices: t.voices }} />
        <div className={`pg-card pg-text${rec.recording ? " hearing" : ""}`}>
          {rec.recording || reading || typing ? (
            <p className={`pg-read${reading ? " reading" : ""}${typing ? " typing" : ""}${rec.recording ? " waiting" : ""}`} lang="ha" aria-hidden={!typing || undefined}>
              {rec.recording ? v.speakNow : parts.map((p, i) => {
                if (i % 2) return p;                                  // the spaces stay as they were
                if (!p) return null;
                w += 1;
                const k = w, at = timing?.[k];
                const cls = reading ? (k === now ? "w now" : k < now ? "w said" : "w") : "w";
                return <span key={i} className={cls} style={{ ["--i" as string]: k, ["--d" as string]: at ? `${Math.max(0.12, at.end - at.start)}s` : "0.3s" } as CSSProperties}>{p}</span>;
              })}
            </p>
          ) : (
            <>
              <label className="sr-only" htmlFor="pg-sl-text">{t.label}</label>
              <textarea id="pg-sl-text" ref={box} lang="ha" rows={1} maxLength={MAX_TEXT} value={text} placeholder={t.placeholder} spellCheck={false}
                onChange={e => { const x = e.target.value; setText(x); setError(null); player.stop(); setTiming(null);
                  setOrigin(ss.some(s => s.text === x.trim()) ? "example" : "typed"); }} />
            </>
          )}
          {example && !rec.recording && <p className="pg-gloss">{example.gloss}</p>}
          <div className="pg-card-foot">
            <button type="button" className={`pg-mic${rec.recording ? " on" : ""}`} onClick={record} disabled={busy !== null}
              aria-label={rec.recording ? v.micStop : v.mic} title={rec.recording ? v.micStop : v.mic}>
              <Icon name={rec.recording ? "stop" : "microphone"} size={17} stroke={1.6} />
            </button>
            <span className={`pg-tag${example ? "" : fromTatsuniya ? " heard" : " live"}`}>{rec.recording ? l.listening(rec.left) : tag}</span>
            {!rec.recording && <>
              {(!fromTatsuniya || text.length > MAX_TEXT) && <span className={`pg-count${text.length >= MAX_TEXT ? " full" : ""}`} aria-label={t.limit}>{t.count(text.length, MAX_TEXT)}</span>}
              {fromTatsuniya && <CopyButton text={text} labels={l} />}
              {clip && <a className="pg-mini pg-dl" href={clip.url} download={clip.name}><Icon name="download" size={15} stroke={1.6} /><span>{t.download}</span></a>}
              <button type="button" className="pg-go" onClick={speak} disabled={busy !== null} aria-busy={busy === "speak" || undefined}>
                <Icon name={player.playing && timing ? "stop" : "play"} size={15} stroke={1.8} />
                {player.playing && timing ? t.stop : busy === "speak" ? c.live.working : fromTatsuniya ? v.hearBack : example ? t.play : t.generate}
              </button>
            </>}
          </div>
        </div>
        <p className={error ? "pg-error" : "pg-call-state"} aria-live="polite">{status}</p>
        <p className="sr-only" aria-live="polite">{fromTatsuniya && !busy ? `${v.heardAnnounce} ${text}` : ""}</p>
      </div>
      <Bar cta={cta}>
        <div className="pg-groups">
          <div className="pg-group">
            <span className="pg-glabel" aria-hidden="true">{v.say}</span>
            <Pills items={ss.map(s => ({ id: s.id, label: s.label }))} value={example?.id ?? null} label={`${v.say}: ${t.scripts}`} onPick={pickExample} />
          </div>
          <div className="pg-group">
            <span className="pg-glabel" aria-hidden="true">{v.transcribe}</span>
            <Pills items={list.map(s => ({ id: s.id, label: s.label }))} value={picked} label={`${v.transcribe}: ${l.samples}`} disabled={busy !== null || rec.recording}
              onPick={id => { const s = list.find(x => x.id === id); if (s) void sample(s); }}
              extra={<>
                <button type="button" className="pg-upload" disabled={busy !== null || rec.recording} onClick={() => file.current?.click()}>{l.upload}</button>
                <input ref={file} type="file" accept="audio/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f); }} />
              </>} />
          </div>
        </div>
      </Bar>
    </>
  );
}

/* ---------------------------------------------------------------- Translate (Kora) */
/* One listening orb with a record button; a clip goes in by recording (up to 15 s, counted down), by upload, or as a
   sample, which plays as it is sent so the visitor hears what the model hears. Kora's answer comes back in writing
   and aloud: what it heard, and the translation. */
type Heard = { text: string; heard?: string; seconds: number; audio?: Blob };

function Translate({ lang, cta }: { lang: Lang; cta: Cta }) {
  const c = playground[lang], t = c.listen;
  const [target, setTarget] = useState<"fr" | "ha">("fr");      // the language Kora answers in
  const list = samples[lang].translate[target];
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [out, setOut] = useState<Heard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const amp = useRef(0);
  const player = usePlayer(amp);
  const abort = useRef<AbortController | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const waking = useWaking(busy);
  const rec = useRecorder(amp, wav => { void send(wav); });
  useEffect(() => () => abort.current?.abort(), []);

  async function send(audio: Blob | ArrayBuffer) {
    abort.current?.abort();
    const ac = (abort.current = new AbortController());
    setBusy(true); setError(null); setOut(null);
    try {
      const res = await demo(`translate?target=${target}`, { headers: { "Content-Type": "application/octet-stream" }, body: audio }, ac.signal);
      const j = await res.json() as { text?: string; source_text?: string; audio_seconds?: number; audio?: string };
      if (!(j.text ?? "").trim()) { setError(t.unheard); return; }
      const spoken = j.audio ? b64Blob(j.audio) : undefined;
      setOut({ text: j.text ?? "", heard: j.source_text, seconds: j.audio_seconds ?? 0, audio: spoken });
      if (spoken) player.play(spoken);
    } catch (e) {
      if (!ac.signal.aborted) setError(demoMessage(e, c, "audio"));
    } finally {
      if (abort.current === ac) setBusy(false);
    }
  }
  const reset = () => { setError(null); setNote(null); };

  async function record() {
    if (rec.recording) { rec.stop(); return; }
    if (busy) return;
    player.stop(); reset(); setPicked(null); setOut(null);
    try { await rec.start(); } catch { setError(t.mic); }
  }
  async function sample(s: Sample) {
    rec.cancel(); reset(); setPicked(s.id);
    try {
      const blob = await (await fetch(s.src)).blob();
      player.play(blob);
      await send(blob);
    } catch { setError(c.live.failed); }
  }
  async function upload(f: File) {
    rec.cancel(); player.stop(); reset(); setPicked(null);
    try {
      const { wav, cut } = await asClip(f);
      if (cut) setNote(t.trimmed);
      await send(wav);
    } catch { setError(t.badFile); }
  }
  const turn = (to: "fr" | "ha") => { if (to === target || busy) return; rec.cancel(); player.stop(); abort.current?.abort(); setTarget(to); setOut(null); setPicked(null); reset(); };

  const status = error ?? (rec.recording ? t.listening(rec.left) : busy ? (waking ? c.live.waking : t.translating) : note ?? t.idleTranslate[target]);
  const from = target === "fr" ? "ha" : "fr";
  const seconds = out ? t.seconds(out.seconds.toFixed(1)) : "";
  /* the direction: in the bar's free left slot on a wide panel, above the orb on a narrow one (CSS shows one) */
  const dir = (where: string) => (
    <div className={`pg-seg pg-dir ${where}`} role="group" aria-label={t.direction}>
      {(["fr", "ha"] as const).map(x => <button key={x} type="button" aria-pressed={target === x} disabled={busy} onClick={() => turn(x)}>{t.dirs[x]}</button>)}
    </div>
  );

  return (
    <>
      <div className="pg-stage pg-listen pg-translate">
        {dir("pg-dir-top")}
        <div className={`pg-agent${rec.recording ? " live hearing" : ""}`}>
          <i aria-hidden="true" /><i aria-hidden="true" />
          <AgentOrb palette={koraPalette} amp={amp} live={rec.recording || player.playing || busy} />
          <button type="button" className={`pg-call${rec.recording ? " on" : ""}`} aria-label={rec.recording ? t.stop : t.record} onClick={record} disabled={busy}>
            <Icon name={rec.recording ? "stop" : "microphone"} size={22} stroke={1.6} />
          </button>
        </div>
        <p className={error ? "pg-error" : "pg-call-state"} aria-live="polite">{status}</p>
        <div className={`pg-card pg-heard${out ? " has" : ""}`} aria-live="polite">
          <div className="pg-row pg-row-from">
            <span className="pg-label">{t.heard} · {t.langs[from]}</span>
            <p lang={from} className={out?.heard ? "" : "muted"}>{out?.heard || "—"}</p>
          </div>
          <div className="pg-row">
            <div className="pg-row-head">
              <span className="pg-label">{`${t.translation} · ${t.langs[target]}`}{out && <span className="muted"> · {seconds}</span>}</span>
              {out && (
                <span className="pg-row-acts">
                  {out.audio && <button type="button" className="pg-mini" onClick={() => out.audio && (player.playing ? player.stop() : player.play(out.audio))}>
                    <Icon name={player.playing ? "stop" : "play"} size={14} stroke={1.8} />{player.playing ? c.tts.stop : t.playTranslation}</button>}
                  <CopyButton text={out.text} labels={t} />
                </span>
              )}
            </div>
            <p lang={target} className={out ? "said" : "said muted"}>{out?.text || t.emptyTranslate}</p>
          </div>
        </div>
      </div>
      <Bar cta={cta} lead={dir("pg-dir-bar")}>
        <Pills items={list.map(s => ({ id: s.id, label: s.label }))} value={picked} label={t.samples} disabled={busy}
          onPick={id => { const s = list.find(x => x.id === id); if (s) void sample(s); }}
          extra={<>
            <button type="button" className="pg-upload" disabled={busy} onClick={() => file.current?.click()}>{t.upload}</button>
            <input ref={file} type="file" accept="audio/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f); }} />
          </>} />
      </Bar>
    </>
  );
}

/* ---------------------------------------------------------------- Converse (Aïr) */
/* A live call: Aïr greets, listens, answers aloud and listens again until the call ends (see lib/call). The orb moves
   with whoever is speaking; the conversation is heard, not written out. */
function Converse({ lang, cta }: { lang: Lang; cta: Cta }) {
  const c = playground[lang], t = c.converse, vs = voices[lang];
  const [persona, setPersona] = useState<Persona>("nadia");
  const [state, setState] = useState<CallState | "idle">("idle");
  const [error, setError] = useState<string | null>(null);
  const amp = useRef(0);
  const call = useRef<AirCall | null>(null);
  const voice = vs.find(v => v.id === persona) ?? vs[0];

  const start = () => {
    setError(null);
    const k = new AirCall(persona, {
      state: s => { if (call.current === k) setState(s === "ended" ? "idle" : s); },
      problem: p => setError(p === "mic" ? t.mic : p === "limit" ? c.live.limited : p === "unavailable" ? c.live.unavailable : c.live.failed),
    }, amp, reduced());
    call.current = k;
    void k.start();
  };
  const end = () => { call.current?.end(); call.current = null; setState("idle"); };
  useEffect(() => () => call.current?.end(), []);

  const live = state !== "idle";
  const line = !live ? error ?? t.idle : state === "connecting" ? t.connecting : state === "thinking" ? t.thinking : state === "speaking" ? t.speaking : t.listening;
  return (
    <>
      <div className="pg-stage pg-converse">
        <div className={`pg-agent${live ? " live" : ""}${state === "hearing" ? " hearing" : ""}`} onClick={() => call.current?.interrupt()}>
          <i aria-hidden="true" /><i aria-hidden="true" />
          <AgentOrb palette={voice.palette} amp={amp} live={live} />
          <button type="button" className={`pg-call${live ? " on" : ""}`} aria-label={live ? t.end : t.start} onClick={e => { e.stopPropagation(); if (live) end(); else start(); }}>
            <Icon name={live ? "close" : "phone-voice"} size={22} stroke={1.6} />
          </button>
        </div>
        <p className={error && !live ? "pg-error" : "pg-call-state"} aria-live="polite">{line}</p>
      </div>
      <Bar cta={cta}>
        <Pills items={vs.map(v => ({ id: v.id as Persona, label: v.name }))} value={persona} onPick={id => { if (id !== persona) { end(); setPersona(id); } }} label={t.voice} />
      </Bar>
    </>
  );
}

/* ---------------------------------------------------------------- API: real requests, run on the demo */
const SAMPLE = "Barka da safiya! Ga labaran yau.";
const host = apiBase.replace(/^https?:\/\//, "");
const CODE: Record<string, ReactNode> = {
  Python: <>
    <span className="k">import</span> os, requests{"\n\n"}r = requests.post({"\n"}{"    "}<span className="s">&quot;https://{host}/v1/speech&quot;</span>,{"\n"}
    {"    "}headers={"{"}<span className="s">&quot;Authorization&quot;</span>: <span className="s">f&quot;Bearer {"{"}os.environ[&apos;NAMU_API_KEY&apos;]{"}"}&quot;</span>{"}"},{"\n"}
    {"    "}json={"{"}<span className="s">&quot;voice&quot;</span>: <span className="s">&quot;nadia&quot;</span>, <span className="s">&quot;text&quot;</span>: <span className="s hl" lang="ha">&quot;{SAMPLE}&quot;</span>{"}"},{"\n"}){"\n"}
    open(<span className="s">&quot;labarai.wav&quot;</span>, <span className="s">&quot;wb&quot;</span>).write(r.content)
  </>,
  JavaScript: <>
    <span className="k">const</span> r = <span className="k">await</span> fetch(<span className="s">&quot;https://{host}/v1/speech&quot;</span>, {"{"}{"\n"}{"  "}method: <span className="s">&quot;POST&quot;</span>,{"\n"}
    {"  "}headers: {"{"} Authorization: <span className="s">`Bearer ${"{"}process.env.NAMU_API_KEY{"}"}`</span>, <span className="s">&quot;Content-Type&quot;</span>: <span className="s">&quot;application/json&quot;</span> {"}"},{"\n"}
    {"  "}body: JSON.stringify({"{"} voice: <span className="s">&quot;nadia&quot;</span>, text: <span className="s hl" lang="ha">&quot;{SAMPLE}&quot;</span> {"}"}),{"\n"}{"}"});{"\n"}
    <span className="k">const</span> wav = <span className="k">await</span> r.arrayBuffer();
  </>,
  cURL: <>
    curl https://{host}/v1/speech \{"\n"}{"  "}-H <span className="s">&quot;Authorization: Bearer $NAMU_API_KEY&quot;</span> \{"\n"}{"  "}-H <span className="s">&quot;Content-Type: application/json&quot;</span> \{"\n"}
    {"  "}-d <span className="s">{"'{"}&quot;voice&quot;: &quot;nadia&quot;, &quot;text&quot;: </span><span className="s hl" lang="ha">&quot;{SAMPLE}&quot;</span><span className="s">{"}'"}</span> \{"\n"}{"  "}-o labarai.wav
  </>,
};
function Api({ lang }: { lang: Lang }) {
  const c = playground[lang], t = c.api;
  const [tab, setTab] = useState("Python");
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [clip, setClip] = useState<{ blob: Blob; seconds: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const amp = useRef(0);
  const player = usePlayer(amp);
  async function run() {
    setState("running"); setError(null);
    try { const out = await speech(SAMPLE, "nadia"); setClip(out); setState("done"); player.play(out.blob); }
    catch (e) { setError(demoMessage(e, c)); setState("idle"); }
  }
  return (
    <div className="pg-api">
      <div className="pg-code">
        <div className="pg-code-head">
          <div className="pg-seg" role="group" aria-label="Language">
            {Object.keys(CODE).map(k => <button key={k} type="button" aria-pressed={k === tab} onClick={() => setTab(k)}>{k}</button>)}
          </div>
          <button type="button" className="pg-run" onClick={run} disabled={state === "running"}>
            <Icon name="play" size={16} stroke={1.8} />{state === "running" ? t.running : t.run}
          </button>
        </div>
        <pre>{CODE[tab]}</pre>
        <div className={`pg-out ${state}`} aria-live="polite">
          <span className="pg-label">{t.output}</span>
          {error ? <span className="pg-error">{error}</span> : state === "idle" ? <span className="muted">—</span> : state === "running" ? <span className="muted">{t.running}</span> : clip && (
            <button type="button" className="pg-file pg-clip" onClick={() => player.play(clip.blob)}>
              <Icon name="waveform" size={18} stroke={1.5} />labarai.wav
              <span className="bars" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ height: `${6 + Math.round(16 * Math.abs(Math.sin(i * 1.3) * Math.cos(i * .4)))}px` }} />)}</span>
              {clip.seconds && <span className="muted">{Number(clip.seconds).toFixed(1)} s</span>}
            </button>
          )}
        </div>
      </div>
      <p className="pg-note">{t.note}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- the console */
export function Playground({ lang }: { lang: Lang }) {
  const c = playground[lang];
  const [tab, setTab] = useState<Tab>("speak");
  const ids = c.tabs.map(x => x.id);
  const build: Cta = { label: c.build, href: lp(lang, "/api#get-started") };
  const pick = (next: Tab, focus = false) => {
    setTab(next);
    const el = document.getElementById(`pg-tab-${next}`);
    if (focus) el?.focus();
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduced() ? "auto" : "smooth" });   // a narrow row of tabs scrolls to it
  };
  const onKey = (e: KeyboardEvent) => {
    const i = ids.indexOf(tab);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      pick(ids[(i + (e.key === "ArrowRight" ? 1 : ids.length - 1)) % ids.length], true);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      pick(ids[e.key === "Home" ? 0 : ids.length - 1], true);
    }
  };
  return (
    <div className="pg">
      <div className="pg-tabs" role="tablist" aria-label="Try the Lab’s models" onKeyDown={onKey}>
        {c.tabs.map(x => (
          <button key={x.id} id={`pg-tab-${x.id}`} type="button" role="tab" aria-selected={tab === x.id} aria-controls={`pg-panel-${x.id}`} tabIndex={tab === x.id ? 0 : -1} onClick={() => pick(x.id)}>
            <span className="dot" aria-hidden="true" style={{ ["--c1" as string]: x.dot[0], ["--c2" as string]: x.dot[1], ["--c3" as string]: x.dot[2] } as CSSProperties} />{x.label}
          </button>
        ))}
      </div>
      <div id={`pg-panel-${tab}`} className="pg-panel" role="tabpanel" aria-labelledby={`pg-tab-${tab}`} key={tab}>
        {tab === "speak" && <SpeakListen lang={lang} cta={build} />}
        {tab === "translate" && <Translate lang={lang} cta={build} />}
        {tab === "converse" && <Converse lang={lang} cta={build} />}
        {tab === "api" && <Api lang={lang} />}
      </div>
    </div>
  );
}
