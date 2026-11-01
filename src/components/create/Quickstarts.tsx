"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../Icon";
import { MiniPlay } from "./bits";
import { createCopy } from "@/content/create";
import { IDEAS, SECTORS, SHOWCASES, sampleOf, type Idea, type Sector, type Showcase } from "@/content/ideas";
import { platformCopy } from "@/content/platform";
import { lp, type Lang } from "@/i18n/config";

/* Create's ideas, after ElevenLabs' Quickstarts: a search, then one grid of tiles with their names over the picture.
   The showcases' footage plays silently in its tile while it is on screen (not with reduced motion or Data Saver,
   where the poster stays); each sector is a tile with its photograph. A tile opens: a showcase with its sound and
   what Namu made for it, a sector with its messages; Use puts one in the box above. */
type Tile = { kind: "show"; show: Showcase } | { kind: "sector"; sector: Sector; ideas: Idea[] };

export function Quickstarts({ lang: ui, voice, usable, onUse, onUseShow }: {
  lang: Lang; voice: string | null; usable: (i: Idea) => boolean; onUse: (i: Idea) => void; onUseShow: (s: Showcase) => void;
}) {
  const t = createCopy[ui].home;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Tile | null>(null);
  /* the showcases and the sectors, one after the other, so every row has footage and a photograph */
  const tiles = useMemo(() => {
    const shows: Tile[] = SHOWCASES.map(show => ({ kind: "show", show }));
    const sectors: Tile[] = SECTORS.map(sector => ({ kind: "sector", sector, ideas: IDEAS.filter(i => i.sector === sector.id) }));
    return Array.from({ length: Math.max(shows.length, sectors.length) }, (_, i) => [shows[i], sectors[i]]).flat().filter((x): x is Tile => !!x);
  }, []);
  const words = q.trim().toLocaleLowerCase(ui);
  const shown = !words ? tiles : tiles.filter(x => {
    const text = x.kind === "show"
      ? [x.show.title[ui], x.show.who[ui], x.show.fr, x.show.does === "speak" ? x.show.ha : ""]
      : [x.sector.name[ui], ...x.ideas.flatMap(i => [i.title[ui], i.fr, i.ha ?? ""])];
    return text.join(" ").toLocaleLowerCase(ui).includes(words);
  });

  return (
    <div className="cr-qs">
      <label className="cr-qs-search">
        <Icon name="search" size={16} stroke={1.6} />
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t.searchIdeas} aria-label={t.searchIdeas} />
      </label>
      {shown.length ? (
        <ul className="cr-qs-grid">
          {shown.map(x => (
            <li key={x.kind === "show" ? x.show.id : x.sector.id}>
              <button type="button" className="cr-qs-tile" onClick={() => setOpen(x)}>
                {x.kind === "show"
                  ? <Preview src={x.show.video} poster={x.show.poster} focus={x.show.focus} />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={x.sector.photo} alt="" loading="lazy" />}
                <span className="cr-qs-name">
                  <em>{x.kind === "show" ? x.show.who[ui] : t.ideasIn(x.ideas.length)}</em>
                  <strong>{x.kind === "show" ? x.show.title[ui] : x.sector.name[ui]}</strong>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="cr-none cr-qs-none">{t.noIdea}</p>}
      {open && (
        <Opened tile={open} ui={ui} voice={voice} usable={usable} onClose={() => setOpen(null)}
          onUse={i => { setOpen(null); onUse(i); }} onUseShow={s => { setOpen(null); onUseShow(s); }} />
      )}
    </div>
  );
}

/** A showcase's footage in its tile: silent, looping, playing only while at least half of it is on screen. */
function Preview({ src, poster, focus }: { src: string; poster: string; focus?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = video.current; if (!v) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      || (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (still) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) void v.play().catch(() => {}); else v.pause(); }, { threshold: .5 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return <video ref={video} src={src} poster={poster} muted loop playsInline preload="none" aria-hidden="true" style={focus ? { objectPosition: focus } : undefined} />;
}

/** A tile opened: the showcase with its sound and what Namu made for it, or a sector and its messages. */
function Opened({ tile, ui, voice, usable, onClose, onUse, onUseShow }: {
  tile: Tile; ui: Lang; voice: string | null; usable: (i: Idea) => boolean; onClose: () => void; onUse: (i: Idea) => void; onUseShow: (s: Showcase) => void;
}) {
  const t = createCopy[ui].home, p = platformCopy[ui];
  const box = useRef<HTMLDialogElement>(null), video = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false), [pos, setPos] = useState(0);
  useEffect(() => {
    const d = box.current; if (!d || d.open) return;       // leaving the page takes the dialog with it: no close() here,
    d.showModal();                                         // which would report a close and shut it again
    void video.current?.play().catch(() => {});            // opened by a tap, so it may speak
  }, []);
  const toggle = () => { const v = video.current; if (!v) return; if (v.paused) void v.play(); else v.pause(); };
  return (
    <dialog ref={box} className="cr-qs-open" onClose={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      aria-label={tile.kind === "show" ? tile.show.title[ui] : tile.sector.name[ui]}>
      <button type="button" className="cr-qs-close" onClick={onClose} aria-label={p.close}><Icon name="close" size={18} stroke={1.6} /></button>
      {tile.kind === "show" ? (
        <>
          <button type="button" className={`cr-qs-media${tile.show.tall ? " tall" : ""}`} onClick={toggle} aria-label={`${on ? p.pause : p.play} · ${tile.show.title[ui]}`}>
            <video ref={video} src={tile.show.video} poster={tile.show.poster} playsInline style={tile.show.focus ? { objectPosition: tile.show.focus } : undefined}
              onPlay={() => setOn(true)} onPause={() => setOn(false)} onEnded={() => { setOn(false); setPos(0); }}
              onTimeUpdate={e => setPos(e.currentTarget.currentTime / (e.currentTarget.duration || 1))} />
            <span className="cr-qs-play" aria-hidden="true"><Icon name={on ? "pause" : "play"} size={16} stroke={1.6} /></span>
            <i className="cr-qs-bar" style={{ transform: `scaleX(${pos})` }} aria-hidden="true" />
          </button>
          <div className="cr-qs-body">
            <span className="cr-qs-kicker">{tile.show.who[ui]}</span>
            <h2>{tile.show.title[ui]}</h2>
            <p lang="ha">{tile.show.ha}</p>
            <p className="cr-qs-fr" lang="fr">{tile.show.fr}</p>
            <div className="cr-qs-acts">
              {tile.show.does === "speak"
                ? <button type="button" className="cx-btn primary" onClick={() => onUseShow(tile.show)}>{t.use}<Icon name="arrow-long" size={14} stroke={1.6} className="rot-up" /></button>
                : <a className="cx-btn primary" href={lp(ui, "/create/interpret")}>{t.tryYours}<Icon name="arrow-long" size={14} stroke={1.6} /></a>}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="cr-qs-photo"><img src={tile.sector.photo} alt="" /><h2>{tile.sector.name[ui]}</h2></div>
          <ul className="cr-qs-list">
            {tile.ideas.map(i => {
              const src = voice ? sampleOf(i, voice) : undefined;
              return (
                <li key={i.id}>
                  <span className="cr-qs-idea">
                    <strong>{i.title[ui]}</strong>
                    <span lang="fr">{i.fr}</span>
                  </span>
                  <span className="cr-qs-idea-acts">
                    {src && <MiniPlay src={src} label={`${p.play} ${i.title[ui]}`} />}
                    {usable(i) && <button type="button" className="cx-btn sm" onClick={() => onUse(i)}>{t.use}<Icon name="arrow-long" size={14} stroke={1.6} className="rot-up" /></button>}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </dialog>
  );
}
