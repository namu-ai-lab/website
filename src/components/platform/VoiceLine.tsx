"use client";

import { useEffect, useRef } from "react";

/* A voice, live: a row of bars that rise with it, the newest on the right and the rest moving left, as the bar of a
   voice note being recorded; a dotted line when nothing is said, and nothing moves then. `side` says where the bars
   grow: above the line ("a", the local language, Kola), below it ("b", French, Sahel), or both ways ("both"), so the
   Interpreter reads like its voice prints. The colours are the element's --a and --b. `level` (0 to 1) and `side` are
   read every frame and should keep their identity between renders. With reduced motion the line stays still. */
export type LineSide = "a" | "b" | "both";
const BARS = 44, STEP_MS = 45;

export function VoiceLine({ level, side, active, className }: { level: () => number; side: () => LineSide; active: boolean; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const bars = useRef<{ v: number; s: LineSide }[]>(Array.from({ length: BARS }, () => ({ v: 0, s: "both" as LineSide })));
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const g = c.getContext("2d"); if (!g) return;
    const css = getComputedStyle(c), colour = { a: css.getPropertyValue("--a").trim() || "#6B3E1E", b: css.getPropertyValue("--b").trim() || "#C5642F" };
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const W = c.width, H = c.height, mid = H / 2, gap = W / BARS, w = Math.max(3, gap * .5);
    let raf = 0, last = 0;
    const draw = () => {
      g.clearRect(0, 0, W, H);
      bars.current.forEach((b, i) => {
        const x = i * gap + (gap - w) / 2, h = Math.max(w, b.v * (mid - 4)), r = w / 2;
        g.fillStyle = b.s === "b" ? colour.b : colour.a;
        g.globalAlpha = b.v < .02 ? .28 : .35 + .65 * (i / BARS);          // older bars fade a little, the dots stay soft
        const y = b.s === "a" ? mid - h : b.s === "b" ? mid : mid - h / 2 - (b.v < .02 ? 0 : h / 2);
        const tall = b.s === "both" && b.v >= .02 ? h * 2 : h;
        g.beginPath(); g.roundRect(x, b.v < .02 ? mid - r : y, w, b.v < .02 ? w : tall, r); g.fill();
      });
      g.globalAlpha = 1;
    };
    const tick = (t: number) => {
      if (t - last >= STEP_MS) {
        last = t;
        const v = active ? Math.max(0, Math.min(1, level())) : 0;
        bars.current.push({ v, s: active ? side() : bars.current[bars.current.length - 1].s });
        bars.current.shift();
        draw();
      }
      if (active || bars.current.some(b => b.v > .01)) raf = requestAnimationFrame(tick);
    };
    if (still) { draw(); return; }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, level, side]);
  return <canvas ref={canvas} className={className} width={440} height={180} aria-hidden="true" />;
}
