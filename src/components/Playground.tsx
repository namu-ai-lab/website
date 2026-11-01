"use client";

/* The home page console: try every one of the Lab's models, after elevenlabs.io's hero panel. Five tabs across the
   top; each puts one object in the middle (the voice reel, a listening orb, Aïr on a call, a code window) over the
   same bar: the choices in the middle, the way in on the right.
     Converse         a live call with Aïr, a research preview (lib/call, /api/demo/converse); the console opens on it
     Text to speech   Tafiya reads what you type, live (/api/demo/speech); the examples play recordings at once
     Transcribe       Tatsuniya writes down what you record, upload or pick (/api/demo/transcribe)
     Translate        Kora answers Hausa in French or French in Hausa, in writing, and aloud into Hausa (/api/demo/translate)
     API              the code, run on the demo
   The browser never holds a key: /api/demo adds the server-held demo key, and the gateway caps the demo at 300
   characters and 15 seconds of audio and limits each visitor. The models are woken at the visitor's first scroll or
   touch (lib/wake), so the first live answer does not wait for a GPU to start. Tabs follow the WAI-ARIA tabs pattern. */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "./Icon";
import { CopyButton } from "./ui/CopyButton";
import { AgentOrb, VoiceReel } from "./VoiceReel";
import { listenPalettes, playground, samples, scripts, voices, type PlaygroundCopy, type Sample, type Tab } from "@/content/playground";
import { lp, type Lang } from "@/i18n/config";
import { apiBase } from "@/lib/public-config";
import { AirCall, TAP, wav16k, type CallState, type Persona } from "@/lib/call";
import { track, type DemoMode } from "@/lib/analytics";
import { useWakeOnFirstTouch } from "@/lib/wake";

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
/** POST to /api/demo/<path>; a failure carries the gateway's status and error type. Each request is recorded as a
 *  demo_run, ok or with the reason it failed (lib/analytics). */
async function demo(path: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
  const mode = path.split("?")[0] as DemoMode;
  let res: Response;
  try { res = await fetch(`/api/demo/${path}`, { method: "POST", ...init, signal }); }
  catch (e) { if (!signal?.aborted) track("demo_run", { mode, result: "network" }); throw e; }
  if (!res.ok) {
    const j = await res.json().catch(() => null) as { error?: { type?: string } } | null;
    track("demo_run", { mode, result: j?.error?.type || String(res.status) });
    throw new DemoError(res.status, j?.error?.type ?? "");
  }
  track("demo_run", { mode, result: "ok" });
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
async function speech(text: string, voice: string, signal?: AbortSignal): Promise<{ blob: Blob; seconds: string }> {
  const res = await demo("speech", { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voice }) }, signal);
  return { blob: await res.blob(), seconds: res.headers.get("x-audio-seconds") ?? "" };
}

/* Each example was spoken by Tafiya through the API beforehand (public/demo/<script>-<voice>.m4a, the best of five takes)
   and plays at once: the example is heard the moment it is picked, with no wait for a sleeping model, and it is the
   model's real output. Text the visitor types or edits is always generated live. */
async function recorded(script: string, voice: string, signal?: AbortSignal): Promise<Blob | null> {
  try { const r = await fetch(`/demo/${script}-${voice}.m4a`, { signal }); return r.ok ? await r.blob() : null; } catch { return null; }
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

/* Plays a clip and writes its loudness into `amp` each frame, so the orb moves with the real voice. Once its panel has
   closed it plays nothing (a reply that arrives late stays silent), and its AudioContext is closed with it, so tab
   switches do not pile contexts up. */
function usePlayer(amp: { current: number }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const context = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const buf = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const url = useRef<string | null>(null);
  const disposed = useRef(false);
  const [playing, setPlaying] = useState(false);
  const ensure = () => {
    if (audio.current) return audio.current;
    const a = new Audio();
    a.onended = a.onpause = () => { setPlaying(false); amp.current = 0; };
    a.onplay = () => setPlaying(true);
    try {
      const ctx = (context.current = new AudioContext()), node = ctx.createAnalyser(); node.fftSize = 512;
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
    if (disposed.current) return;
    const a = ensure();
    if (url.current) URL.revokeObjectURL(url.current);
    a.src = url.current = URL.createObjectURL(blob);
    void a.play();
  };
  const stop = () => { audio.current?.pause(); amp.current = 0; };
  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true;
      audio.current?.pause(); audio.current = null; analyser.current = null;
      if (url.current) { URL.revokeObjectURL(url.current); url.current = null; }
      void context.current?.close().catch(() => {}); context.current = null;
    };
  }, []);
  return { play, stop, playing };
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
   left for the countdown, and 16 kHz WAV handed to `onClip` when the visitor stops or 15 seconds run out.
   Opening the microphone takes a permission prompt and two awaits, so: a take that is still starting blocks another
   (`starting`, which also disables the button); cancel() or the panel closing during the prompt leaves nothing behind
   (each await is followed by a check, and a stale start closes what it opened); and finish() closes the take it is
   given, never a newer one. */
function useRecorder(amp: { current: number }, onClip: (wav: ArrayBuffer) => void) {
  type Take = { ctx: AudioContext; stream: MediaStream; node: AudioWorkletNode; chunks: Float32Array[]; n: number; closed: boolean };
  const take = useRef<Take | null>(null);
  const done = useRef(onClip); done.current = onClip;
  const [left, setLeft] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const opening = useRef(false), gen = useRef(0), disposed = useRef(false);
  const finish = (s: Take | null, send: boolean) => {
    if (!s || s.closed) return;
    s.closed = true;
    s.node.port.onmessage = null; s.node.disconnect(); s.stream.getTracks().forEach(t => t.stop());
    const rate = s.ctx.sampleRate; void s.ctx.close();
    if (take.current === s) { take.current = null; amp.current = 0; setLeft(null); }
    if (send && !disposed.current && s.n > rate * 0.4) done.current(wav16k(s.chunks, rate));     // under 0.4 s is a stray tap, not speech
  };
  const start = async () => {
    if (opening.current || take.current) return;
    const g = ++gen.current, stale = () => disposed.current || g !== gen.current;
    opening.current = true; setStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
      if (stale()) { stream.getTracks().forEach(t => t.stop()); return; }
      const ctx = new AudioContext();
      try {
        await ctx.resume().catch(() => {});          // iOS pauses the context while it switches to the microphone
        await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([TAP], { type: "application/javascript" })));
        if (stale()) { stream.getTracks().forEach(t => t.stop()); void ctx.close(); return; }
        const node = new AudioWorkletNode(ctx, "namu-tap"), mute = ctx.createGain(); mute.gain.value = 0;
        ctx.createMediaStreamSource(stream).connect(node); node.connect(mute); mute.connect(ctx.destination);
        const s: Take = { ctx, stream, node, chunks: [], n: 0, closed: false }, max = (ctx.sampleRate * MAX_CLIP_MS) / 1000;
        take.current = s;
        node.port.onmessage = (e: MessageEvent<Float32Array>) => {
          const x = e.data; s.chunks.push(x); s.n += x.length;
          let sum = 0; for (const v of x) sum += v * v;
          amp.current = reduced() ? 0 : Math.min(1, Math.sqrt(sum / x.length) * 6);
          setLeft(Math.max(0, Math.ceil((max - s.n) / ctx.sampleRate)));
          if (s.n >= max) finish(s, true);
        };
        setLeft(Math.round(MAX_CLIP_MS / 1000));
      } catch (e) { stream.getTracks().forEach(t => t.stop()); void ctx.close(); throw e; }
    } finally { if (g === gen.current) { opening.current = false; setStarting(false); } }
  };
  const cancel = () => { gen.current++; opening.current = false; setStarting(false); finish(take.current, false); };
  useEffect(() => {
    disposed.current = false;
    return () => { disposed.current = true; gen.current++; finish(take.current, false); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  return { start, stop: () => finish(take.current, true), cancel, starting, recording: left !== null, left: left ?? 0 };
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

/* ---------------------------------------------------------------- Text to speech (Tafiya) */
function TextToSpeech({ lang, cta }: { lang: Lang; cta: Cta }) {
  const c = playground[lang], t = c.tts, ss = scripts[lang], vs = voices[lang];
  const [text, setText] = useState(ss[0].text);
  const [vi, setVi] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clip, keepClip] = useClipUrl();
  const amp = useRef(0);
  const player = usePlayer(amp);
  const cache = useRef(new Map<string, Blob>());     // each voice and text is generated once per visit
  const box = useRef<HTMLTextAreaElement>(null);
  const waking = useWaking(busy);
  /* a request still out when the tab closes is abandoned; one that comes back after the voice or the text changed is
     kept in the cache but not played */
  const req = useRef<AbortController | null>(null);
  const shown = useRef(""); shown.current = `${vs[vi].id}\n${text.trim()}`;
  useEffect(() => () => req.current?.abort(), []);
  useEffect(() => {                                   // the box is as tall as its text, no taller
    const el = box.current;
    if (!el) return;
    el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`;
  }, [text]);
  const example = ss.find(s => s.text === text.trim()) ?? null;   // an example, as written

  const stop = () => player.stop();
  async function play() {
    if (player.playing) { stop(); return; }
    if (busy) return;
    const body = text.trim();
    if (!body) { setError(t.empty); return; }
    const voice = vs[vi].id, k = `${voice}\n${body}`;
    setError(null);
    let blob = cache.current.get(k);
    if (!blob) {
      setBusy(true);
      const ac = (req.current = new AbortController());
      try { blob = (example && await recorded(example.id, voice, ac.signal)) || (await speech(body, voice, ac.signal)).blob; cache.current.set(k, blob); }
      catch (e) { if (!ac.signal.aborted) setError(demoMessage(e, c, "text")); return; }
      finally { setBusy(false); }
      if (shown.current !== k) return;
    }
    keepClip(blob, blob.type.includes("mp4") || blob.type.includes("m4a") ? `tafiya-${voice}-${example?.id ?? "clip"}.m4a` : `tafiya-${voice}.wav`);
    player.play(blob);
  }

  return (
    <>
      <div className="pg-stage pg-tts">
        <VoiceReel voices={vs} index={vi} onIndex={i => { stop(); setVi(i); }} playing={player.playing} onPlay={play} amp={amp}
          labels={{ play: t.play, stop: t.stop, previous: t.previous, next: t.next, voices: t.voices }} />
        <div className="pg-card pg-text">
          <label className="sr-only" htmlFor="pg-tts-text">{t.label}</label>
          <textarea id="pg-tts-text" ref={box} lang="ha" rows={1} maxLength={MAX_TEXT} value={text} placeholder={t.placeholder} spellCheck={false}
            onChange={e => { setText(e.target.value); setError(null); stop(); }} />
          {example && <p className="pg-gloss">{example.gloss}</p>}
          <div className="pg-card-foot">
            <span className={`pg-tag${example ? "" : " live"}`}>{example ? t.example : t.live}</span>
            <span className={`pg-count${text.length >= MAX_TEXT ? " full" : ""}`} aria-label={t.limit}>{t.count(text.length, MAX_TEXT)}</span>
            {clip && <a className="pg-mini" href={clip.url} download={clip.name}><Icon name="download" size={15} stroke={1.6} />{t.download}</a>}
            <button type="button" className="pg-go" onClick={play} disabled={busy} aria-busy={busy || undefined}>
              <Icon name={player.playing ? "stop" : "play"} size={15} stroke={1.8} />{player.playing ? t.stop : busy ? c.live.working : t.generate}
            </button>
          </div>
        </div>
        <p className={error ? "pg-error" : "pg-call-state"} aria-live="polite">{error ?? (busy ? (waking ? c.live.waking : c.live.working) : " ")}</p>
      </div>
      <Bar cta={cta}>
        <Pills items={ss.map(s => ({ id: s.id, label: s.label }))} value={example?.id ?? null} label={t.scripts}
          onPick={id => { stop(); setError(null); setText(ss.find(s => s.id === id)?.text ?? ""); }} />
      </Bar>
    </>
  );
}

/* ---------------------------------------------------------------- Speech to text (Tatsuniya) and Translate (Kora) */
/* One listening orb with a record button; a clip goes in by recording (up to 15 s, counted down), by upload, or as a
   sample, which plays as it is sent so the visitor hears what the model hears. Speech to text shows the transcript;
   Translate shows what Kora heard and its translation, and speaks the translation. */
type Heard = { text: string; heard?: string; seconds: number; audio?: Blob };

function Listen({ lang, cta, mode }: { lang: Lang; cta: Cta; mode: "stt" | "translate" }) {
  const c = playground[lang], t = c.listen;
  const [target, setTarget] = useState<"fr" | "ha">("fr");      // Translate: the language Kora answers in
  const list = mode === "stt" ? samples[lang].stt : samples[lang].translate[target];
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [out, setOut] = useState<Heard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const amp = useRef(0);
  const player = usePlayer(amp);
  const abort = useRef<AbortController | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const said = useRef<HTMLParagraphElement>(null);
  const waking = useWaking(busy);
  const rec = useRecorder(amp, wav => { void send(wav); });
  const gone = useRef(false);       // the panel has closed: a sample or upload still being read is not sent
  useEffect(() => { gone.current = false; return () => { gone.current = true; abort.current?.abort(); }; }, []);

  async function send(audio: Blob | ArrayBuffer) {
    if (gone.current) return;
    abort.current?.abort();
    const ac = (abort.current = new AbortController());
    setBusy(true); setError(null); setOut(null);
    try {
      const res = await demo(mode === "stt" ? "transcribe" : `translate?target=${target}`,
        { headers: { "Content-Type": "application/octet-stream" }, body: audio }, ac.signal);
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
    if (busy || rec.starting) return;
    player.stop(); reset(); setPicked(null); setOut(null);
    try { await rec.start(); } catch { setError(t.mic); track("mic_denied", { mode: mode === "stt" ? "transcribe" : "translate" }); }
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

  const status = error ?? (rec.recording ? t.listening(rec.left)
    : busy ? (waking ? c.live.waking : mode === "stt" ? t.transcribing : t.translating)
    : note ?? (mode === "stt" ? t.idle : t.idleTranslate[target]));
  const from = target === "fr" ? "ha" : "fr";
  const seconds = out ? t.seconds(out.seconds.toFixed(1)) : "";
  /* Translate's direction: in the bar's free left slot on a wide panel, above the orb on a narrow one (CSS shows one) */
  const dir = (where: string) => mode === "translate" && (
    <div className={`pg-seg pg-dir ${where}`} role="group" aria-label={t.direction}>
      {(["fr", "ha"] as const).map(x => <button key={x} type="button" aria-pressed={target === x} disabled={busy} onClick={() => turn(x)}>{t.dirs[x]}</button>)}
    </div>
  );

  return (
    <>
      <div className={`pg-stage pg-listen pg-${mode}`}>
        {dir("pg-dir-top")}
        <div className={`pg-agent${rec.recording ? " live hearing" : ""}`}>
          <i aria-hidden="true" /><i aria-hidden="true" />
          <AgentOrb palette={listenPalettes[mode]} amp={amp} live={rec.recording || player.playing || busy} />
          <button type="button" className={`pg-call${rec.recording ? " on" : ""}`} aria-label={rec.recording ? t.stop : t.record} onClick={record} disabled={busy || rec.starting}>
            <Icon name={rec.recording ? "stop" : "microphone"} size={22} stroke={1.6} />
          </button>
        </div>
        <p className={error ? "pg-error" : "pg-call-state"} aria-live="polite">{status}</p>
        <div className={`pg-card pg-heard${out ? " has" : ""}`} aria-live="polite">
          {mode === "translate" && (
            <div className="pg-row pg-row-from">
              <span className="pg-label">{t.heard} · {t.langs[from]}</span>
              <p lang={from} className={out?.heard ? "" : "muted"}>{out?.heard || "—"}</p>
            </div>
          )}
          <div className="pg-row">
            <div className="pg-row-head">
              <span className="pg-label">{mode === "stt" ? t.result : `${t.translation} · ${t.langs[target]}`}{out && <span className="muted"> · {seconds}</span>}</span>
              {out && (
                <span className="pg-row-acts">
                  {out.audio && <button type="button" className="pg-mini" onClick={() => out.audio && (player.playing ? player.stop() : player.play(out.audio))}>
                    <Icon name={player.playing ? "stop" : "play"} size={14} stroke={1.8} />{player.playing ? c.tts.stop : t.playTranslation}</button>}
                  <CopyButton text={out.text} labels={{ copy: t.copy, copied: t.copied, failed: t.copyFailed }} select={said} className="pg-mini" icon={{ size: 15, stroke: 1.6 }} />
                </span>
              )}
            </div>
            <p lang={mode === "stt" ? "ha" : target} className={out ? "said" : "said muted"} ref={said}>{out?.text || (mode === "stt" ? t.empty : t.emptyTranslate)}</p>
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

  /* One call at a time: the button shows "connecting" at once, and a second tap during the microphone prompt or the
     welcome cannot start another call (which would keep its own microphone, out of reach of End). Callbacks from a
     call that is no longer current are ignored. */
  const start = () => {
    if (call.current) return;
    setError(null); setState("connecting");
    const k = new AirCall(persona, {
      state: s => {
        if (call.current !== k) return;
        if (s === "ended") { call.current = null; setState("idle"); } else setState(s);
      },
      problem: p => {
        if (call.current !== k) return;
        setError(p === "mic" ? t.mic : p === "limit" ? c.live.limited : p === "unavailable" ? c.live.unavailable : c.live.failed);
        if (p === "mic") track("mic_denied", { mode: "converse" }); else track("demo_run", { mode: "converse", result: p });
      },
    }, amp, reduced());
    call.current = k;
    track("demo_run", { mode: "converse", result: "start" });
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
        {vs.length > 1 && <Pills items={vs.map(v => ({ id: v.id as Persona, label: v.name }))} value={persona} onPick={id => { if (id !== persona) { end(); setPersona(id); } }} label={t.voice} />}
      </Bar>
    </>
  );
}

/* ---------------------------------------------------------------- API: real requests, run on the demo */
const SAMPLE = "Sannu da zuwa! Muna farin cikin jin muryarku.";   // HA-REVIEW: the first example’s line
const host = apiBase.replace(/^https?:\/\//, "");
const CODE: Record<string, ReactNode> = {
  Python: <>
    <span className="k">import</span> os, requests{"\n\n"}r = requests.post({"\n"}{"    "}<span className="s">&quot;https://{host}/v1/speech&quot;</span>,{"\n"}
    {"    "}headers={"{"}<span className="s">&quot;Authorization&quot;</span>: <span className="s">f&quot;Bearer {"{"}os.environ[&apos;NAMU_API_KEY&apos;]{"}"}&quot;</span>{"}"},{"\n"}
    {"    "}json={"{"}<span className="s">&quot;voice&quot;</span>: <span className="s">&quot;nadia&quot;</span>, <span className="s">&quot;text&quot;</span>: <span className="s hl" lang="ha">&quot;{SAMPLE}&quot;</span>{"}"},{"\n"}){"\n"}
    open(<span className="s">&quot;sannu.wav&quot;</span>, <span className="s">&quot;wb&quot;</span>).write(r.content)
  </>,
  JavaScript: <>
    <span className="k">const</span> r = <span className="k">await</span> fetch(<span className="s">&quot;https://{host}/v1/speech&quot;</span>, {"{"}{"\n"}{"  "}method: <span className="s">&quot;POST&quot;</span>,{"\n"}
    {"  "}headers: {"{"} Authorization: <span className="s">`Bearer ${"{"}process.env.NAMU_API_KEY{"}"}`</span>, <span className="s">&quot;Content-Type&quot;</span>: <span className="s">&quot;application/json&quot;</span> {"}"},{"\n"}
    {"  "}body: JSON.stringify({"{"} voice: <span className="s">&quot;nadia&quot;</span>, text: <span className="s hl" lang="ha">&quot;{SAMPLE}&quot;</span> {"}"}),{"\n"}{"}"});{"\n"}
    <span className="k">const</span> wav = <span className="k">await</span> r.arrayBuffer();
  </>,
  cURL: <>
    curl https://{host}/v1/speech \{"\n"}{"  "}-H <span className="s">&quot;Authorization: Bearer $NAMU_API_KEY&quot;</span> \{"\n"}{"  "}-H <span className="s">&quot;Content-Type: application/json&quot;</span> \{"\n"}
    {"  "}-d <span className="s">{"'{"}&quot;voice&quot;: &quot;nadia&quot;, &quot;text&quot;: </span><span className="s hl" lang="ha">&quot;{SAMPLE}&quot;</span><span className="s">{"}'"}</span> \{"\n"}{"  "}-o sannu.wav
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
  const req = useRef<AbortController | null>(null);
  useEffect(() => () => req.current?.abort(), []);      // closing the tab abandons the request: nothing plays later
  async function run() {
    const ac = (req.current = new AbortController());
    setState("running"); setError(null);
    try { const out = await speech(SAMPLE, "nadia", ac.signal); setClip(out); setState("done"); player.play(out.blob); }
    catch (e) { if (ac.signal.aborted) return; setError(demoMessage(e, c)); setState("idle"); }
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
              <Icon name="waveform" size={18} stroke={1.5} />sannu.wav
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
  const [tab, setTab] = useState<Tab>("converse");
  useWakeOnFirstTouch();
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
        {tab === "tts" && <TextToSpeech lang={lang} cta={build} />}
        {tab === "stt" && <Listen lang={lang} cta={build} mode="stt" />}
        {tab === "translate" && <Listen lang={lang} cta={build} mode="translate" />}
        {tab === "converse" && <Converse lang={lang} cta={build} />}
        {tab === "api" && <Api lang={lang} />}
      </div>
    </div>
  );
}
