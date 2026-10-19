"use client";

/* The home page console: try the Lab's models, after elevenlabs.io's hero panel. Three tabs across the
   top. Speak and Converse each put one object in the middle (a reel of voices, Aïr on a call; see VoiceReel) over the
   same bar: the choices in the middle, the way in on the right. API keeps the code window it had before
   the redesign. Nothing is connected yet: playback, calls and runs are timed animation.
   Tabs follow the WAI-ARIA tabs pattern. */
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "./Icon";
import { AgentOrb, VoiceReel } from "./VoiceReel";
import { playground, scripts, voices, type Tab } from "@/content/playground";
import { lp, type Lang } from "@/i18n/config";

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
  const t = playground[lang].speak, ss = scripts[lang], vs = voices[lang];
  const [sid, setSid] = useState(ss[0].id);
  const [vi, setVi] = useState(0);
  const [playing, setPlaying] = useState(false);
  const amp = useRef(0);
  const script = ss.find(s => s.id === sid) ?? ss[0];
  const length = script.text.split(/\s+/).length * 340 + 200;   // how long the script takes to say

  useTicker(playing, ms => {
    if (ms >= length) { setPlaying(false); amp.current = 0; return false; }
    amp.current = reduced() ? 0 : envelope(ms / 1000);
  });
  const stop = () => { setPlaying(false); amp.current = 0; };
  const pick = (id: string) => { stop(); setSid(id); };

  return (
    <>
      <div className="pg-stage pg-speak">
        <VoiceReel voices={vs} index={vi} onIndex={i => { stop(); setVi(i); }} playing={playing} onPlay={() => (playing ? stop() : setPlaying(true))} amp={amp}
          labels={{ play: t.play, stop: t.stop, previous: t.previous, next: t.next, voices: t.voices }} />
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

/* ---------------------------------------------------------------- API */
const CODE: Record<string, ReactNode> = {
  Python: <>
    <span className="k">from</span> namu <span className="k">import</span> Namu{"\n\n"}client = Namu(){"\n"}audio = client.speech.create({"\n"}
    {"    "}model=<span className="s">&quot;tafiya&quot;</span>,{"\n"}{"    "}voice=<span className="s">&quot;warm&quot;</span>,{"\n"}    {"    "}text=<span className="s hl" lang="ha">&quot;Barka da safiya! Ga labaran yau.&quot;</span>,{"\n"}){"\n"}audio.save(<span className="s">&quot;labarai.wav&quot;</span>)
  </>,
  JavaScript: <>
    <span className="k">import</span> Namu <span className="k">from</span> <span className="s">&quot;namu&quot;</span>;{"\n\n"}<span className="k">const</span> client = <span className="k">new</span> Namu();{"\n"}
    <span className="k">const</span> audio = <span className="k">await</span> client.speech.create({"{"}{"\n"}{"  "}model: <span className="s">&quot;tafiya&quot;</span>,{"\n"}{"  "}voice: <span className="s">&quot;warm&quot;</span>,{"\n"}
    {"  "}text: <span className="s hl" lang="ha">&quot;Barka da safiya! Ga labaran yau.&quot;</span>,{"\n"}{"}"});
  </>,
  cURL: <>
    curl api.namu-ai.org/v1/speech \{"\n"}{"  "}-H <span className="s">&quot;Authorization: Bearer $NAMU_API_KEY&quot;</span> \{"\n"}{"  "}-d <span className="s">{"'{"}&quot;model&quot;: &quot;tafiya&quot;, &quot;voice&quot;: &quot;warm&quot;,</span>{"\n"}
    {"       "}<span className="s">&quot;text&quot;: </span><span className="s hl" lang="ha">&quot;Barka da safiya! Ga labaran yau.&quot;</span><span className="s">{"}'"}</span> \{"\n"}{"  "}-o labarai.wav
  </>,
};
function Api({ lang }: { lang: Lang }) {
  const t = playground[lang].api;
  const [tab, setTab] = useState("Python");
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  useTicker(state === "running", ms => { if (ms > 1100) { setState("done"); return false; } });
  return (
    <div className="pg-api">
      <div className="pg-code">
        <div className="pg-code-head">
          <div className="pg-seg" role="group" aria-label="Language">
            {Object.keys(CODE).map(k => <button key={k} type="button" aria-pressed={k === tab} onClick={() => { setTab(k); setState("idle"); }}>{k}</button>)}
          </div>
          <button type="button" className="pg-run" onClick={() => setState("running")} disabled={state === "running"}>
            <Icon name="play" size={16} stroke={1.8} />{state === "running" ? t.running : t.run}
          </button>
        </div>
        <pre>{CODE[tab]}</pre>
        <div className={`pg-out ${state}`} aria-live="polite">
          <span className="pg-label">{t.output}</span>
          {state === "idle" ? <span className="muted">—</span> : state === "running" ? <span className="muted">{t.running}</span> : (
            <span className="pg-file"><Icon name="waveform" size={18} stroke={1.5} />labarai.wav<span className="bars" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ height: `${6 + Math.round(16 * Math.abs(Math.sin(i * 1.3) * Math.cos(i * .4)))}px` }} />)}</span><span className="muted">2.6 s</span></span>
          )}
        </div>
      </div>
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
