"use client";

/* The /api page's showcase, after elevenlabs.io's: one panel, a tab per model, and the model's real output ready to
   play at once (recorded through the API, so there is no cold start and no demo key to spend). Text to speech plays
   the chosen example in the chosen voice; speech to text plays what Tatsuniya heard and writes its transcript along
   with it; translation plays the Hausa question and Kora's French answer; conversation plays Aïr's welcome, and
   links to the home page's live call. Each orb moves with the sound. */
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "../Icon";
import { AgentOrb, VoiceReel } from "../VoiceReel";
import { useClips } from "./useClips";
import { AIR_HELLO, API_TASKS, ENDPOINT, TASK_DOT, apiCopy, type ApiTask } from "@/content/api";
import { listenPalettes, scripts, voices } from "@/content/playground";
import { useCases } from "@/content/usecases";
import type { Lang } from "@/i18n/config";

/* the hooked letters of Hausa, marked where they appear */
const hooked = (s: string): ReactNode => s.split(/([ɓɗƙƴƁƊƘƳ])/).map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p));

export function ApiShowcase({ lang, signup, liveHref }: { lang: Lang; signup: string; liveHref: string }) {
  const a = apiCopy[lang], s = a.show;
  const [task, setTask] = useState<ApiTask>("speech");
  const [script, setScript] = useState(0), [vi, setVi] = useState(0);
  const { amp, now, progress, play, stop } = useClips();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const vs = voices[lang], ex = scripts[lang];
  const cases = useCases[lang].cases;
  // heritage in a voicing Tatsuniya transcribed (Hausa), translation in a voicing Kora translated (Hausa)
  const heard = cases.find(c => c.id === "heritage")!.voicings.find(v => v.transcript)!;
  const asked = cases.find(c => c.id === "translation")!.voicings.find(v => v.lang === "ha")!;
  const model = a.models.find(m => m.task === task)!;

  const speechSrc = (si: number, v: number) => [`/demo/${ex[si].id}-${vs[v].id}.m4a`];
  const toggle = (id: string, srcs: string[]) => (now?.id === id ? stop() : play(id, srcs));
  const on = (id: string) => now?.id === id;

  const choose = (t: ApiTask) => { if (t !== task) { stop(); setTask(t); } };
  const onTabKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + API_TASKS.length) % API_TASKS.length;
    choose(API_TASKS[j]); tabs.current[j]?.focus();
  };

  // a render helper, not a component: the button must keep its identity (and its focus) while the clip plays
  const playButton = (id: string, srcs: string[]) => (
    <button type="button" className={`ax-play${on(id) ? " on" : ""}`} onClick={() => toggle(id, srcs)} aria-pressed={on(id)}>
      <Icon name={on(id) ? "stop" : "play"} size={16} stroke={1.8} />{on(id) ? s.stop : s.play}
    </button>
  );

  // Tatsuniya's transcript: while its clip plays, the words arrive with the sound.
  const words = heard.transcript!.text.split(" ");
  const shownWords = on("transcribe") ? Math.ceil(progress * words.length) : words.length;

  return (
    <div className="ax-show">
      <div className="ax-show-tabs" role="tablist" aria-label={s.label}>
        {API_TASKS.map((t, i) => (
          <button key={t} ref={el => { tabs.current[i] = el; }} type="button" role="tab" id={`ax-tab-${t}`} aria-controls="ax-stage"
            aria-selected={t === task} tabIndex={t === task ? 0 : -1} onClick={() => choose(t)} onKeyDown={e => onTabKey(e, i)}>
            <i style={{ background: TASK_DOT[t] }} aria-hidden="true" />{s.tabs[t]}
          </button>
        ))}
      </div>

      <div className={`ax-stage is-${task}`} id="ax-stage" role="tabpanel" aria-labelledby={`ax-tab-${task}`}>
        {task === "speech" && <>
          <div className="ax-stage-text">
            <div className="ax-chips" role="group" aria-label={s.examples}>
              {ex.map((x, i) => (
                <button key={x.id} type="button" aria-pressed={i === script} onClick={() => { setScript(i); play("speech", speechSrc(i, vi)); }}>{x.label}</button>
              ))}
            </div>
            <p className="ax-say" lang="ha">{ex[script].text}</p>
            <p className="ax-gloss">{ex[script].gloss}</p>
            {playButton("speech", speechSrc(script, vi))}
          </div>
          <div className="ax-stage-orb">
            <VoiceReel voices={vs} index={vi} onIndex={i => { stop(); setVi(i); }} playing={on("speech")} amp={amp}
              onPlay={() => toggle("speech", speechSrc(script, vi))}
              labels={{ play: s.play, stop: s.stop, previous: s.previous, next: s.next, voices: s.voices }} />
          </div>
        </>}

        {task === "transcribe" && <>
          <div className="ax-stage-text">
            <p className="ax-kicker">{s.wrote}</p>
            <p className="ax-say ax-words" lang="ha" aria-live="off">
              {words.map((w, i) => <span key={i} className={i < shownWords ? "in" : undefined}>{hooked(w)}{i < words.length - 1 ? " " : ""}</span>)}
            </p>
            <p className="ax-gloss">{heard.gloss}</p>
            {playButton("transcribe", heard.clips.map(c => c.src))}
          </div>
          <div className="ax-stage-orb"><AgentOrb palette={listenPalettes.stt} amp={amp} live={on("transcribe")} /></div>
        </>}

        {task === "translate" && <>
          <div className="ax-stage-text">
            <ol className={`ax-turns${on("translate") ? " playing" : ""}`}>
              {asked.clips.map((c, i) => (
                <li key={c.src} className={on("translate") && now?.part === i ? "now" : undefined}>
                  <span className="ax-kicker">{i ? s.translated : s.asked}</span>
                  <p className="ax-say" lang={c.lang}>{c.text}</p>
                </li>
              ))}
            </ol>
            {playButton("translate", asked.clips.map(c => c.src))}
          </div>
          <div className="ax-stage-orb"><AgentOrb palette={listenPalettes.translate} amp={amp} live={on("translate")} /></div>
        </>}

        {task === "converse" && <>
          <div className="ax-stage-text">
            <p className="ax-kicker"><span className="ax-badge">{s.research}</span></p>
            <p className="ax-say" lang="ha">{AIR_HELLO.text}</p>
            <p className="ax-gloss">{AIR_HELLO.gloss[lang]}</p>
            <div className="ax-row">
              {playButton("converse", [AIR_HELLO.src])}
              <a className="ax-link" href={liveHref}>{s.call}<Icon name="arrow-long" size={15} stroke={1.6} /></a>
            </div>
          </div>
          <div className="ax-stage-orb"><AgentOrb palette={vs[0].palette} amp={amp} live={on("converse")} /></div>
        </>}
      </div>

      <div className="ax-show-bar">
        <p className="ax-show-model"><code className="ax-ep"><b>POST</b>{ENDPOINT[task]}</code><span>{model.name} · {model.status}</span></p>
        <a className="pill dark" href={signup}>{a.start}<Icon name="arrow-long" size={16} stroke={1.6} /></a>
      </div>
    </div>
  );
}

/* A single orb at rest, for the page's last section. */
export function RestingOrb({ palette }: { palette: readonly string[] }) {
  const still = useRef(0);
  return <AgentOrb palette={palette} amp={still} live={false} />;
}
