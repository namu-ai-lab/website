"use client";

import { useEffect, useRef, useState } from "react";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Plays recorded clips one after the other through one <audio> element and measures how loud they are, for the orbs
   (`amp`, 0 to 1; it stays 0 under reduced motion). One sequence plays at a time: starting another replaces it.
   `now` says which sequence and which of its clips is playing, `progress` how far through that clip. After unmount
   nothing plays and the AudioContext is closed. */
export function useClips() {
  const el = useRef<HTMLAudioElement | null>(null), analyser = useRef<AnalyserNode | null>(null), context = useRef<AudioContext | null>(null);
  const queue = useRef<{ id: string; srcs: string[]; part: number } | null>(null), disposed = useRef(false), gen = useRef(0);
  const amp = useRef(0);
  const [now, setNow] = useState<{ id: string; part: number } | null>(null), [progress, setProgress] = useState(0);

  const ensure = () => {
    if (el.current) return el.current;
    const a = new Audio();
    const end = () => { queue.current = null; amp.current = 0; setNow(null); };
    a.onended = () => {
      const q = queue.current;
      if (!q || q.part + 1 >= q.srcs.length) return end();
      q.part += 1; a.src = q.srcs[q.part]; setProgress(0); setNow({ id: q.id, part: q.part });
      void a.play().catch(end);
    };
    a.onpause = () => { if (a.paused && !a.ended) end(); };   // stopped; the end of a clip is onended's, and a pause
                                                            // that arrives after the next play() is stale
    a.onerror = end;
    try {
      const ctx = (context.current = new AudioContext()), node = ctx.createAnalyser(); node.fftSize = 512;
      ctx.createMediaElementSource(a).connect(node); node.connect(ctx.destination);
      analyser.current = node; a.addEventListener("play", () => { void ctx.resume(); });
    } catch { /* no Web Audio: the sound still plays, the orb stays calm */ }
    return (el.current = a);
  };

  useEffect(() => {
    if (!now) return;
    let raf = 0; const buf = new Uint8Array(512), still = reduced();
    const tick = () => {
      const a = el.current, node = analyser.current;
      if (a?.duration) setProgress(a.currentTime / a.duration);
      if (node && !still) {
        node.getByteTimeDomainData(buf);
        let s = 0; for (const v of buf) s += ((v - 128) / 128) ** 2;
        amp.current = Math.min(1, Math.sqrt(s / buf.length) * 4);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [now]);

  useEffect(() => {
    disposed.current = false;
    return () => {
      disposed.current = true; queue.current = null;
      if (el.current) { el.current.onpause = el.current.onended = el.current.onerror = null; el.current.pause(); }
      el.current = null; analyser.current = null;
      void context.current?.close().catch(() => {}); context.current = null;
    };
  }, []);

  const play = (id: string, srcs: string[]) => {
    if (disposed.current || !srcs.length) return;
    const a = ensure();
    const g = ++gen.current;
    queue.current = { id, srcs, part: 0 };
    a.src = srcs[0]; setProgress(0); setNow({ id, part: 0 });
    void a.play().catch(() => { if (gen.current === g) { queue.current = null; setNow(null); } });
  };
  const stop = () => { el.current?.pause(); };
  return { amp, now, progress, play, stop };
}
