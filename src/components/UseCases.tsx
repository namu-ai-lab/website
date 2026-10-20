"use client";

/* The home page's use cases (content/usecases.ts), after openai.com's: a grid of cards, each a picture, an icon, a
   title and a sentence, with a button that opens more. Here the button opens what the use case sounds like: a play
   button, the line in Hausa (or Hausa and then French), its translation, how the sound was made and the models it
   would be built on. One card is open at a time, and one clip plays at a time. On a phone the cards run in a row
   that scrolls sideways. */
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
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
    const a = new Audio(c.clips[k].src);
    audio.current = a; setPlaying({ id: c.id, k });
    a.onended = () => { if (audio.current === a) play(c, k + 1); };
    a.onerror = () => { if (audio.current === a) setPlaying(null); };
    void a.play().catch(() => setPlaying(null));
  };
  useEffect(() => () => audio.current?.pause(), []);

  return (
    <section id="use-cases" className="section uc" aria-labelledby="h-uc">
      <div className="wrap">
        <div className="uc-head">
          <h2 id="h-uc" className="h2">{t.title}</h2>
          <p>{t.sub}</p>
          <div className="uc-ctas">
            <a className="uc-btn light" href={`mailto:contact@namuai.org?subject=${encodeURIComponent("Partner with Namu")}`}>{t.partner}</a>
            <a className="uc-btn" href={lp(lang, "/api")}>{t.build}<Icon name="external" size={15} stroke={1.8} /></a>
          </div>
        </div>
        <div className="uc-grid">
          {t.cases.map(c => {
            const isOpen = open === c.id, on = playing?.id === c.id;
            return (
              <article key={c.id} className={`uc-card${isOpen ? " open" : ""}`} data-case={c.id}>
                <div className="uc-pic">
                  {c.photo
                    ? <img src={c.photo.src} alt={c.photo.alt} loading="lazy" style={c.photo.position ? { objectPosition: c.photo.position } : undefined} />
                    : <span className="uc-haze" aria-hidden="true" />}
                  <span className="uc-tile" aria-hidden="true"><Icon name={c.icon} size={26} stroke={1.5} /></span>
                  {c.photo && <small className="uc-credit">{c.photo.credit}</small>}
                </div>
                <div className="uc-body">
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </div>
                <div className="uc-more" id={`uc-${c.id}`} hidden={!isOpen}>
                  <button type="button" className={`uc-play${on ? " on" : ""}`} onClick={() => (on ? stop() : play(c))} aria-label={`${on ? t.stop : t.play}: ${c.title}`}>
                    <Icon name={on ? "stop" : "play"} size={18} stroke={1.6} />
                    <span className="uc-bars" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => <i key={i} style={{ height: `${5 + Math.round(15 * Math.abs(Math.sin(i * 1.7 + c.id.length) * Math.cos(i * .5)))}px` }} />)}</span>
                  </button>
                  {c.clips.map((clip, k) => (
                    <p key={k} className={`uc-line${on && playing?.k === k ? " now" : ""}`}>
                      <span className="uc-by">{clip.by}</span><q lang={clip.lang}>{clip.text}</q>
                    </p>
                  ))}
                  {c.transcript && <p className="uc-line uc-heard"><span className="uc-by">{c.transcript.by}</span><samp lang="ha">{c.transcript.text}</samp></p>}
                  {c.gloss && <p className="uc-gloss">{c.gloss}</p>}
                  <p className="uc-note">{c.note}</p>
                  <p className="uc-models"><span>{t.models}</span>{c.models.map(m => <em key={m}>{m}</em>)}</p>
                </div>
                <button type="button" className="uc-toggle" aria-expanded={isOpen} aria-controls={`uc-${c.id}`}
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
