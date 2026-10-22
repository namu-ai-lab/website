"use client";

/* "Where voice can help", on the Organisations page: the home page's use cases turned towards partners. Pick a sector;
   the left plays what a programme there could sound like (a line spoken by the Lab's own models through the API, its
   meaning, and for oral heritage what Tatsuniya wrote down), the right sketches the programme: who it reaches, how,
   and what would be measured with the partner. Each programme is an illustration, and the page says so. */
import { useEffect, useRef, useState } from "react";
import { NightArt } from "./Art";
import { Icon } from "./Icon";
import { orgCopy } from "@/content/organisations";
import { useCases } from "@/content/usecases";
import type { Lang } from "@/i18n/config";

const ORDER = ["health", "farming", "education", "public", "translation", "heritage"];
const LANG_NAME: Record<Lang, Record<"ha" | "fr", string>> = { en: { ha: "Hausa", fr: "French" }, fr: { ha: "hausa", fr: "français" } };

export function OrgSectors({ lang }: { lang: Lang }) {
  const t = orgCopy[lang], ui = t.sectorUi;
  const cases = ORDER.map(id => useCases[lang].cases.find(c => c.id === id)!).filter(Boolean);
  const [on, setOn] = useState(cases[0].id);
  const [playing, setPlaying] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const c = cases.find(x => x.id === on)!, s = t.sectors[c.id];

  const stop = () => { audio.current?.pause(); audio.current = null; setPlaying(null); setProgress(0); };
  const play = (k = 0) => {
    const clip = c.clips[k];
    if (!clip) { stop(); return; }
    audio.current?.pause();
    const a = new Audio(clip.src);
    audio.current = a; setPlaying(k);
    a.ontimeupdate = () => { if (a.duration) setProgress(a.currentTime / a.duration); };
    a.onended = () => { if (audio.current === a) play(k + 1); };
    a.onerror = () => { if (audio.current === a) stop(); };
    void a.play().catch(() => stop());
  };
  useEffect(() => stop, [on]);   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="os">
      <div className="os-tabs" role="tablist" aria-label={t.sectorsH}>
        {cases.map(x => (
          <button key={x.id} type="button" role="tab" id={`os-t-${x.id}`} aria-controls="os-panel" aria-selected={x.id === on} onClick={() => setOn(x.id)}>
            <Icon name={x.icon} size={18} stroke={1.4} />{x.title}
          </button>
        ))}
      </div>
      <div className="os-panel" id="os-panel" role="tabpanel" aria-labelledby={`os-t-${c.id}`} key={c.id}>
        <figure className="os-stage">
          <div className="os-art" aria-hidden="true"><NightArt seed={`org-${c.id}`} ratio="card" tone={c.id === "health" || c.id === "education" ? "rose" : "warm"} /></div>
          <div className="os-msg">
            <button type="button" className="os-play" aria-label={playing !== null ? ui.stop : ui.play} onClick={() => (playing !== null ? stop() : play(0))}>
              <Icon name={playing !== null ? "stop" : "play"} size={20} stroke={1.8} />
            </button>
            <div className="os-lines">
              {c.clips.map((clip, k) => (
                <p key={clip.src} className={`os-line${playing === k ? " on" : ""}`} lang={clip.lang}>
                  <span>{clip.text}</span>
                  <small>{clip.by} · {LANG_NAME[lang][clip.lang]}</small>
                </p>
              ))}
              {c.gloss && <p className="os-gloss">{c.gloss}</p>}
              {c.transcript && <p className="os-heard"><small>{ui.heard}</small><span lang="ha">{c.transcript.text}</span></p>}
            </div>
            <span className="os-bar" aria-hidden="true"><i style={{ width: `${playing !== null ? ((playing + progress) / c.clips.length) * 100 : 0}%` }} /></span>
          </div>
          <figcaption>{c.note}</figcaption>
        </figure>
        <div className="os-body">
          <h3>{c.title}</h3>
          <p className="os-d">{c.body}</p>
          <dl>
            <div><dt>{ui.who}</dt><dd>{s.who}</dd></div>
            <div><dt>{ui.channel}</dt><dd>{s.channel}</dd></div>
            <div><dt>{ui.measure}</dt><dd>{s.measure}</dd></div>
          </dl>
          <p className="os-models"><span>{ui.models}</span>{c.models.join(", ")}</p>
          <p className="os-note">{ui.note}</p>
        </div>
      </div>
    </div>
  );
}
