"use client";

/* The home page console: try the Lab's models, after elevenlabs.io's hero panel. Three tabs across the
   top. Speak and Converse each put one object in the middle (a reel of voices, Aïr on a call; see VoiceReel) over the
   same bar: the choices in the middle, the way in on the right. API keeps the code window it had before
   the redesign. Speak and API are live: the browser calls /api/demo/speech, which adds the server-held demo key;
   the gateway caps the demo at 300 characters and limits each visitor. Converse is a live call with Aïr, a research
   preview (see lib/call and /api/demo/converse). Tabs follow the WAI-ARIA tabs pattern. */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "./Icon";
import { AgentOrb, VoiceReel } from "./VoiceReel";
import { playground, scripts, voices, type PlaygroundCopy, type Tab } from "@/content/playground";
import { lp, type Lang } from "@/i18n/config";
import { apiBase } from "@/lib/env";
import { AirCall, type CallState, type Persona } from "@/lib/call";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
class DemoError extends Error {}
const demoMessage = (e: unknown, t: PlaygroundCopy["live"]) => {
  const status = e instanceof DemoError ? Number(e.message) : 0;
  return status === 429 ? t.limited : status === 503 || status === 404 ? t.unavailable : t.failed;
};
async function speech(text: string, voice: string): Promise<{ blob: Blob; seconds: string }> {
  const res = await fetch("/api/demo/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, voice }) });
  if (!res.ok) throw new DemoError(String(res.status));
  return { blob: await res.blob(), seconds: res.headers.get("x-audio-seconds") ?? "" };
}

/* Each script was spoken once by Tafiya through the API (public/demo/<script>-<voice>.m4a), so the demo plays the
   model's real output at once and works without the live demo key; anything without a recording is generated live. */
async function recorded(script: string, voice: string): Promise<Blob | null> {
  try { const r = await fetch(`/demo/${script}-${voice}.m4a`); return r.ok ? await r.blob() : null; } catch { return null; }
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
  return { play, stop, playing };
}

/* ---------------------------------------------------------------- the bar under every tab */
type Cta = { label: string; href: string };

function Bar({ cta, children }: { cta: Cta; children?: ReactNode }) {
  return (
    <div className="pg-bar">
      <span aria-hidden="true" />
      <div className="pg-bar-c">{children}</div>
      <a className="pg-cta" href={cta.href}>{cta.label}</a>
    </div>
  );
}

function Pills<T extends string>({ items, value, onPick, label }: { items: { id: T; label: string }[]; value: T; onPick: (id: T) => void; label: string }) {
  return (
    <div className="pg-pills" role="group" aria-label={label}>
      {items.map(x => <button key={x.id} type="button" aria-pressed={x.id === value} onClick={() => onPick(x.id)}>{x.label}</button>)}
    </div>
  );
}

/* ---------------------------------------------------------------- Speak (Tafiya) */
function Speak({ lang, cta }: { lang: Lang; cta: Cta }) {
  const c = playground[lang], t = c.speak, ss = scripts[lang], vs = voices[lang];
  const [sid, setSid] = useState(ss[0].id);
  const [vi, setVi] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amp = useRef(0);
  const player = usePlayer(amp);
  const cache = useRef(new Map<string, Blob>());     // each voice and script is generated once per visit
  const script = ss.find(s => s.id === sid) ?? ss[0];

  const stop = () => player.stop();
  const pick = (id: string) => { stop(); setSid(id); };
  async function play() {
    if (player.playing) { stop(); return; }
    if (loading) return;
    const voice = vs[vi].id, k = `${voice}\n${script.text}`;
    setError(null);
    let clip = cache.current.get(k);
    if (!clip) {
      setLoading(true);
      try { clip = (await recorded(script.id, voice)) ?? (await speech(script.text, voice)).blob; cache.current.set(k, clip); }
      catch (e) { setError(demoMessage(e, c.live)); return; }
      finally { setLoading(false); }
    }
    player.play(clip);
  }

  return (
    <>
      <div className="pg-stage pg-speak">
        <VoiceReel voices={vs} index={vi} onIndex={i => { stop(); setVi(i); }} playing={player.playing} onPlay={play} amp={amp}
          labels={{ play: t.play, stop: t.stop, previous: t.previous, next: t.next, voices: t.voices }} />
        <p className={error ? "pg-error" : "pg-call-state"} aria-live="polite">{error ?? (loading ? c.live.working : " ")}</p>
      </div>
      <Bar cta={cta}>
        <Pills items={ss.map(s => ({ id: s.id, label: s.label }))} value={sid} onPick={pick} label={t.scripts} />
      </Bar>
    </>
  );
}

/* ---------------------------------------------------------------- Converse (Aïr) */
/* A live call: Aïr greets, listens, answers aloud and listens again until the call ends (see lib/call). The orb moves
   with whoever is speaking; under it, what Aïr heard and what it said, in Hausa. */
function Converse({ lang, cta }: { lang: Lang; cta: Cta }) {
  const c = playground[lang], t = c.converse, vs = voices[lang];
  const [persona, setPersona] = useState<Persona>("nadia");
  const [state, setState] = useState<CallState | "idle">("idle");
  const [heard, setHeard] = useState(""), [said, setSaid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const amp = useRef(0);
  const call = useRef<AirCall | null>(null);
  const voice = vs.find(v => v.id === persona) ?? vs[0];

  const start = () => {
    setError(null); setHeard(""); setSaid("");
    const k = new AirCall(persona, {
      state: s => { if (call.current === k) setState(s === "ended" ? "idle" : s); },
      heard: x => { setHeard(x); setSaid(""); },
      reply: setSaid,
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
        <div className="pg-captions" aria-live="polite">
          {heard && <p><span>{t.you}</span><q lang="ha">{heard}</q></p>}
          {said && <p><span>{t.air}</span><q lang="ha">{said}</q></p>}
        </div>
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
    catch (e) { setError(demoMessage(e, c.live)); setState("idle"); }
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
  const onKey = (e: KeyboardEvent) => {
    const i = ids.indexOf(tab);
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next = ids[(i + (e.key === "ArrowRight" ? 1 : ids.length - 1)) % ids.length];
      setTab(next); document.getElementById(`pg-tab-${next}`)?.focus();
    }
  };
  return (
    <div className="pg">
      <div className="pg-tabs" role="tablist" aria-label="Try the Lab’s models" onKeyDown={onKey}>
        {c.tabs.map(x => (
          <button key={x.id} id={`pg-tab-${x.id}`} type="button" role="tab" aria-selected={tab === x.id} aria-controls={`pg-panel-${x.id}`} tabIndex={tab === x.id ? 0 : -1} onClick={() => setTab(x.id)}>
            <span className="dot" aria-hidden="true" style={{ ["--c1" as string]: x.dot[0], ["--c2" as string]: x.dot[1], ["--c3" as string]: x.dot[2] } as CSSProperties} />{x.label}
          </button>
        ))}
      </div>
      <div id={`pg-panel-${tab}`} className="pg-panel" role="tabpanel" aria-labelledby={`pg-tab-${tab}`} key={tab}>
        {tab === "speak" && <Speak lang={lang} cta={build} />}
        {tab === "converse" && <Converse lang={lang} cta={build} />}
        {tab === "api" && <Api lang={lang} />}
      </div>
    </div>
  );
}
