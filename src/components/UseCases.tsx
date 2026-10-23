"use client";

/* The home page's use cases (content/usecases.ts), after openai.com's: a grid of cards, each a picture, an icon, a
   title and a sentence, with a button that opens more. Here the button opens what the use case sounds like: a play
   button, the line in Hausa (or Hausa and then French), its translation, how the sound was made and the models it
   would be built on. One card is open at a time, and one clip plays at a time. On a phone the cards run in a row
   that scrolls sideways. */
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { TallyLink } from "./Tally";
import { track } from "@/lib/analytics";
import { useCases, type UseCase } from "@/content/usecases";
import { lp, type Lang } from "@/i18n/config";

export function UseCases({ lang }: { lang: Lang }) {
  const t = useCases[lang];
  const [open, setOpen] = useState<string | null>(null);
  const [playing, setPlaying] = useState<{ id: string; k: number } | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const stop = () => { audio.current?.pause(); audio.current = null; setPlaying(null); };
  /* play a case's clips one after the other */
  const play = (c: UseCase, k = 0) => {
    audio.current?.pause();
    if (k >= c.clips.length) { setPlaying(null); return; }
    if (k === 0) track("example_play", { page: "home", case: c.id });
    const a = new Audio(c.clips[k].src);
    audio.current = a; setPlaying({ id: c.id, k });
    a.onended = () => { if (audio.current === a) play(c, k + 1); };
    a.onerror = () => { if (audio.current === a) setPlaying(null); };
    void a.play().catch(() => setPlaying(null));
  };
  useEffect(() => () => audio.current?.pause(), []);

  return (
    <section id="use-cases" className="section cs" aria-labelledby="h-cs">
      <div className="wrap">
        <div className="cs-head">
          <h2 id="h-cs" className="h2">{t.title}</h2>
          <p>{t.sub}</p>
          <div className="cs-ctas">
            <TallyLink className="cs-btn light" form="partner" lang={lang} source="lab-home-use-cases">{t.partner}</TallyLink>
            <a className="cs-btn" href={lp(lang, "/api")}>{t.build}<Icon name="external" size={15} stroke={1.8} /></a>
          </div>
        </div>
        <div className="cs-grid">
          {t.cases.map(c => {
            const isOpen = open === c.id, on = playing?.id === c.id;
            return (
              <article key={c.id} className={`cs-card${isOpen ? " open" : ""}`} data-case={c.id}>
                <div className="cs-pic">
                  {c.photo
                    ? <img src={c.photo.src} alt={c.photo.alt} loading="lazy" style={c.photo.position ? { objectPosition: c.photo.position } : undefined} />
                    : <span className="cs-haze" aria-hidden="true" />}
                  <span className="cs-tile" aria-hidden="true"><Icon name={c.icon} size={26} stroke={1.5} /></span>
                  {c.photo && <small className="cs-credit">{c.photo.credit}</small>}
                </div>
                <div className="cs-body">
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </div>
                <div className="cs-more" id={`cs-${c.id}`} hidden={!isOpen}>
                  <button type="button" className={`cs-play${on ? " on" : ""}`} onClick={() => (on ? stop() : play(c))} aria-label={`${on ? t.stop : t.play}: ${c.title}`}>
                    <Icon name={on ? "stop" : "play"} size={18} stroke={1.6} />
                    <span className="cs-bars" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ height: `${5 + Math.round(15 * Math.abs(Math.sin(i * 1.7 + c.id.length) * Math.cos(i * .5)))}px` }} />)}</span>
                  </button>
                  {c.clips.map((clip, k) => (
                    <p key={k} className={`cs-line${on && playing?.k === k ? " now" : ""}`}>
                      <span className="cs-by">{clip.by}</span><q lang={clip.lang}>{clip.text}</q>
                    </p>
                  ))}
                  {c.transcript && <p className="cs-line cs-heard"><span className="cs-by">{c.transcript.by}</span><samp lang="ha">{c.transcript.text}</samp></p>}
                  {c.gloss && <p className="cs-gloss">{c.gloss}</p>}
                  <p className="cs-note">{c.note}</p>
                  <p className="cs-models"><span>{t.models}</span>{c.models.map(m => <em key={m}>{m}</em>)}</p>
                </div>
                <button type="button" className="cs-toggle" aria-expanded={isOpen} aria-controls={`cs-${c.id}`}
                  onClick={() => { if (isOpen) { setOpen(null); stop(); } else { setOpen(c.id); play(c); } }}>
                  {isOpen ? t.hide : t.hear}<Icon name="chevron" size={16} stroke={1.8} />
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
