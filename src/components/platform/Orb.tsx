"use client";

import { useEffect, useRef } from "react";

/* Namu's voice, drawn: a warm sphere with four voice lines. While `active` they move with `level` (0 to 1, read every
   frame), then settle and rest; nothing loops while it is quiet. With reduced motion the lines stay still. Agents'
   talk panel follows the agent's voice with it; Create's Interpreter, the person speaking, Namu thinking and Namu
   speaking. `level` should keep its identity between renders. */
export function Orb({ level, active, className }: { level: () => number; active: boolean; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ level: 0, phase: 0, raf: 0 });
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const g = c.getContext("2d"); if (!g) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const W = c.width, H = c.height, R = W * .46, s = state.current;
    const draw = () => {
      g.clearRect(0, 0, W, H); g.save(); g.beginPath(); g.arc(W / 2, H / 2, R, 0, Math.PI * 2); g.clip();
      const grad = g.createRadialGradient(W * .36, H * .32, R * .05, W / 2, H / 2, R * 1.05);
      grad.addColorStop(0, "#FFF4E6"); grad.addColorStop(.45, "#F6C8A0"); grad.addColorStop(.8, "#E8935A"); grad.addColorStop(1, "#B4552A");
      g.fillStyle = grad; g.fillRect(0, 0, W, H);
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        const amp = (5 + 40 * s.level) * (1 - k * .18), freq = 1.6 + k * .55, off = k * 1.3;
        for (let x = 0; x <= W; x += 4) {
          const u = x / W, y = H / 2 + (k - 1.5) * 13 + Math.sin(u * Math.PI * 2 * freq + s.phase + off) * amp * Math.sin(Math.PI * u);
          if (x) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.strokeStyle = `rgba(255,250,241,${.75 - k * .14})`; g.lineWidth = 2.8 - k * .45; g.stroke();
      }
      g.restore();
    };
    const tick = () => {
      const target = active ? Math.max(0, Math.min(1, level())) : 0;
      s.level += (target - s.level) * .18;
      if (!still) s.phase += .05 + s.level * .08;
      draw();
      if (active || s.level > .01) s.raf = requestAnimationFrame(tick);
      else { s.level = 0; draw(); }
    };
    if (still) { draw(); return; }
    tick();
    return () => cancelAnimationFrame(s.raf);
  }, [active, level]);
  return <canvas ref={canvas} className={className} width={360} height={360} aria-hidden="true" />;
}
