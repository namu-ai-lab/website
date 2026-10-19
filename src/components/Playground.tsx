"use client";

/* The home page console: try the Lab's models, after elevenlabs.io's hero panel. Three tabs across the
   top. Speak and Converse each put one object in the middle (a reel of voices, Aïr on a call; see VoiceReel) over the
   same bar: the choices in the middle, the way in on the right. API keeps the code window it had before
   the redesign. Speak and API are live: the browser calls /api/demo/speech, which adds the server-held demo key;
   the gateway caps the demo at 300 characters and limits each visitor. Converse is a timed preview while Aïr is
   in research. Tabs follow the WAI-ARIA tabs pattern. */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "./Icon";
import { AgentOrb, VoiceReel } from "./VoiceReel";
import { playground, scripts, voices, type PlaygroundCopy, type Tab } from "@/content/playground";
import { lp, type Lang } from "@/i18n/config";
import { apiBase } from "@/lib/env";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* A loudness envelope with the rhythm of speech: syllables about 190 ms apart, gathered into words. */
const envelope = (t: number) => {
  const syllable = Math.max(0, Math.sin(t * Math.PI * 2 * 5.2)) ** .6;
  const phrase = .55 + .45 * Math.abs(Math.sin(t * 2.1) * Math.sin(t * .7 + 1));
  return Math.min(1, syllable * phrase * (.86 + .14 * Math.sin(t * 37.1)));
};

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
      try { clip = (await speech(script.text, voice)).blob; cache.current.set(k, clip); }
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
function Converse({ lang, cta }: { lang: Lang; cta: Cta }) {
  const c = playground[lang], t = c.converse, tab = c.tabs[1];
  const [state, setState] = useState<"idle" | "connecting" | "live">("idle");
  const amp = useRef(0);
  const per = 2600;   // one turn of the conversation; the caller and Aïr take turns until the call ends

  useTicker(state !== "idle", ms => {
    if (state === "connecting") { if (ms > 900) setState("live"); return; }
    const air = Math.floor(ms / per) % 2 === 1;
    const talking = (ms % per) / per < .78;
    amp.current = reduced() ? 0 : talking ? envelope(ms / 1000) * (air ? 1 : .45) : 0;
  });
  useEffect(() => { if (state === "idle") amp.current = 0; }, [state]);

  return (
    <>
      <div className="pg-stage pg-converse">
        <div className={`pg-agent${state === "live" ? " live" : ""}`}>
          <i aria-hidden="true" /><i aria-hidden="true" />
          <AgentOrb palette={tab.dot} amp={amp} live={state === "live"} />
          <button type="button" className={`pg-call${state !== "idle" ? " on" : ""}`} aria-label={state === "idle" ? t.start : t.end} onClick={() => setState(s => (s === "idle" ? "connecting" : "idle"))}>
            <Icon name={state === "idle" ? "phone-voice" : "close"} size={22} stroke={1.6} />
          </button>
        </div>
        <p className="pg-call-state" aria-live="polite">{state === "idle" ? t.start : state === "connecting" ? t.connecting : t.end}</p>
      </div>
      <Bar cta={cta} />
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
