"use client";

/* The Organisations page's "Hear an example": a small dark button, like openaifoundation.org's "Read the latest", that
   plays a use case's line as the Lab's models speak it (content/usecases.ts). Once played, the line stays below the
   button, with what it means, how it was made and, where a model transcribed it, what the model wrote. One plays at a
   time across the page. */
import { useEffect, useRef, useState } from "react";
import type { Clip } from "@/content/usecases";
import { track } from "@/lib/analytics";

const EVT = "org-listen";

export function OrgListen({ id, clips, gloss, note, transcript, heard, hear, stop }:
  { id: string; clips: Clip[]; gloss: string; note: string; transcript?: { text: string }; heard: string; hear: string; stop: string }) {
  const [on, setOn] = useState(false);
  const [shown, setShown] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  const halt = () => { audio.current?.pause(); audio.current = null; setOn(false); };
  const play = (k = 0) => {
    audio.current?.pause();
    if (k >= clips.length) { audio.current = null; setOn(false); return; }
    const a = new Audio(clips[k].src);
    audio.current = a;
    a.onended = () => { if (audio.current === a) play(k + 1); };
    a.onerror = () => { if (audio.current === a) halt(); };
    void a.play().catch(() => halt());
  };
  const start = () => {
    window.dispatchEvent(new CustomEvent(EVT, { detail: id })); setOn(true); setShown(true); play();
    track("example_play", { page: "organisations", case: id });
  };

  useEffect(() => {
    const other = (e: Event) => { if ((e as CustomEvent<string>).detail !== id) halt(); };
    window.addEventListener(EVT, other);
    return () => { window.removeEventListener(EVT, other); audio.current?.pause(); };
  }, [id]);

  return (
    <div className="ofd-listen">
      <button type="button" className={`ofd-btn${on ? " on" : ""}`} aria-pressed={on} onClick={() => (on ? halt() : start())}>
        <span className="ofd-bars" aria-hidden="true"><i /><i /><i /><i /></span>{on ? stop : hear}
      </button>
      <div className="ofd-said" aria-live="polite" hidden={!shown}>
        {shown && <>
          {clips.map(c => <p key={c.src} lang={c.lang}>“{c.text}”</p>)}
          {gloss && <p className="ofd-gloss">{gloss}</p>}
          {transcript && <p className="ofd-gloss">{heard}: <span lang="ha">{transcript.text}</span></p>}
          <p className="ofd-by">{note}</p>
        </>}
      </div>
    </div>
  );
}
