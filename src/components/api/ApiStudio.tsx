"use client";

/* The /api studio: a glass panel over the film, a tab per model. On the left the request, in the docs' own code
   (cURL, Python or JavaScript, one choice for the page); on the right what the model returned, ready to play: the
   models' own output, recorded through the API, so nothing waits for a model to wake. One sentence runs through it:
   Tafiya says it, Tatsuniya writes it down as it plays, Kora answers in French. Aïr's tab plays its welcome. */
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "../Icon";
import { CODE_LANGS, useCodeLang, type CodeLang } from "../CodeTabs";
import { Highlight } from "../Highlight";
import { CopyButton } from "../ui/CopyButton";
import { useClips } from "./useClips";
import { API_TASKS, ENVELOPE, STUDIO, apiCopy, type ApiTask } from "@/content/api";
import type { Lang } from "@/i18n/config";

/* the hooked letters of Hausa, marked where they appear */
const hooked = (s: string): ReactNode => s.split(/([ɓɗƙƴƁƊƘƳ])/).map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p));

/* a recording's voice line, filled as far as it has played */
function VoiceLine({ src, played }: { src: string; played: number }) {
  const env = ENVELOPE[src] ?? [];
  const W = 4, G = 3, H = 72;
  return (
    <svg className="ax-line" viewBox={`0 0 ${env.length * (W + G) - G} ${H}`} aria-hidden="true">
      {env.map((v, i) => {
        const h = Math.max(4, v * H);
        return <rect key={i} x={i * (W + G)} y={(H - h) / 2} width={W} height={h} rx={W / 2} className={i / env.length < played ? "on" : undefined} />;
      })}
    </svg>
  );
}

export function ApiStudio({ lang, code, liveHref }: { lang: Lang; code: Record<ApiTask, Record<CodeLang, string>>; liveHref: string }) {
  const s = apiCopy[lang].studio;
  const [task, setTask] = useState<ApiTask>("speech");
  const [codeLang, pickLang] = useCodeLang();
  const { now, progress, play, stop } = useClips();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const shown = useRef<HTMLElement>(null);

  const clips: Record<ApiTask, string[]> = {
    speech: [STUDIO.story], transcribe: [STUDIO.story], translate: [STUDIO.story, STUDIO.storyFr.src], converse: [STUDIO.air.src],
  };
  const on = now?.id === task;
  // the voice line follows the clip that is playing; at rest, Translate shows Kora's answer
  const lineSrc = on ? clips[task][now?.part ?? 0] : clips[task][clips[task].length - 1];
  const played = on ? progress : 0;

  const choose = (t: ApiTask) => { if (t !== task) { stop(); setTask(t); } };
  const onTabKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + API_TASKS.length) % API_TASKS.length;
    choose(API_TASKS[j]); tabs.current[j]?.focus();
  };

  const words = STUDIO.heard.split(" ");
  const shownWords = on && task === "transcribe" ? Math.ceil(progress * words.length) : words.length;

  return (
    <div className="ax-studio">
      <div className="ax-studio-bar">
        <div className="ax-tabs" role="tablist" aria-label={s.label}>
          {API_TASKS.map((t, i) => (
            <button key={t} ref={el => { tabs.current[i] = el; }} type="button" role="tab" id={`ax-tab-${t}`} aria-controls="ax-panel"
              aria-selected={t === task} tabIndex={t === task ? 0 : -1} onClick={() => choose(t)} onKeyDown={e => onTabKey(e, i)}>{s.tabs[t]}</button>
          ))}
        </div>
        <div className="ax-langs" role="group" aria-label="Language">
          {CODE_LANGS.map(l => <button key={l} type="button" aria-pressed={l === codeLang} onClick={() => pickLang(l)}>{l}</button>)}
        </div>
      </div>

      <div className="ax-studio-body" id="ax-panel" role="tabpanel" aria-labelledby={`ax-tab-${task}`}>
        <div className="ax-req">
          <CopyButton text={code[task][codeLang]} labels={{ copy: s.copy, copied: s.copied, failed: s.copyFailed }} select={shown} className="ax-copy" iconOnly />
          <pre tabIndex={0}><code ref={shown}><Highlight code={code[task][codeLang]} lang={codeLang} /></code></pre>
        </div>

        <div className="ax-res">
          <button type="button" className={`ax-play${on ? " on" : ""}`} aria-pressed={on} aria-label={on ? s.stop : s.play}
            onClick={() => (on ? stop() : play(task, clips[task]))}>
            <Icon name={on ? "stop" : "play"} size={22} stroke={1.8} />
          </button>
          <VoiceLine src={lineSrc} played={played} />

          {task === "speech" && <p className="ax-out">{s.gloss}</p>}
          {task === "transcribe" && (
            <div className="ax-out-wrap">
              <p className="ax-by">{s.wrote}</p>
              <p className="ax-out" lang="ha">
                {words.map((w, i) => <span key={i} className={i < shownWords ? "in" : undefined}>{hooked(w)}{i < words.length - 1 ? " " : ""}</span>)}
              </p>
            </div>
          )}
          {task === "translate" && (
            <div className="ax-out-wrap">
              <p className="ax-by">{s.answered}</p>
              <p className={`ax-out${on && now?.part === 0 ? " wait" : ""}`} lang="fr">{STUDIO.storyFr.says}</p>
            </div>
          )}
          {task === "converse" && (
            <div className="ax-out-wrap">
              <p className="ax-by"><span className="ax-badge">{s.research}</span></p>
              <p className="ax-out">{s.airGloss}</p>
              <a className="ax-live" href={liveHref}>{s.call}<Icon name="arrow-long" size={15} stroke={1.6} /></a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
