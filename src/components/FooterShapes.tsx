"use client";

/* The footer's toy, after labs.google's: a handful of shapes from Namu's own vocabulary drop onto the line
   when the footer comes into view, and can be picked up and thrown. A voice orb, the Blossom's open arc and
   its Sahel dot, a speech bubble, a sound capsule, a doorway arch of the Sahel's earth architecture, in the
   voice orbs' colours. Physics by matter-js; each shape is an SVG moved by its body. Only a shape takes the
   pointer, so a swipe across the empty space still scrolls the page. Nothing runs once the pile is asleep,
   and with reduced motion the pile is simply shown at rest. */
import { useEffect, useRef } from "react";
import type * as MatterNS from "matter-js";

type Kind = "orb" | "blossom" | "bubble" | "capsule" | "arch" | "square" | "dot";
type Shape = { kind: Kind; w: number; h: number; colour: string };

/* sizes in units of u (about a seventh of the row's width) */
const SHAPES: Shape[] = [
  { kind: "square", w: 0.95, h: 0.95, colour: "#f5a3bb" },
  { kind: "orb", w: 1.05, h: 1.05, colour: "#f0884f" },
  { kind: "capsule", w: 1.55, h: 0.62, colour: "#c29be0" },
  { kind: "blossom", w: 1.05, h: 1.05, colour: "#2b2622" },
  { kind: "arch", w: 0.95, h: 1.1, colour: "#ffbe48" },
  { kind: "bubble", w: 1.2, h: 0.95, colour: "#7c9bd2" },
  { kind: "orb", w: 0.8, h: 0.8, colour: "#7c9bd2" },
  { kind: "dot", w: 0.42, h: 0.42, colour: "#e8935a" },
];

function art(s: Shape) {
  const vb = `0 0 ${s.w * 100} ${s.h * 100}`, W = s.w * 100, H = s.h * 100;
  switch (s.kind) {
    case "orb": case "dot": return <svg viewBox={vb}><circle cx={W / 2} cy={H / 2} r={W / 2} fill={s.colour} /></svg>;
    case "square": return <svg viewBox={vb}><rect width={W} height={H} rx={22} fill={s.colour} /></svg>;
    case "capsule": return <svg viewBox={vb}><rect width={W} height={H} rx={H / 2} fill={s.colour} /></svg>;
    case "arch": return <svg viewBox={vb}><path d={`M0 ${W / 2} A${W / 2} ${W / 2} 0 0 1 ${W} ${W / 2} V${H - 8} Q${W} ${H} ${W - 8} ${H} H8 Q0 ${H} 0 ${H - 8} Z`} fill={s.colour} /></svg>;
    case "bubble": return <svg viewBox={vb}><path d={`M26 0 H${W - 26} Q${W} 0 ${W} 26 V${H * 0.62} Q${W} ${H * 0.78} ${W - 26} ${H * 0.78} H44 L18 ${H} L22 ${H * 0.78} Q0 ${H * 0.78} 0 ${H * 0.62} V26 Q0 0 26 0 Z`} fill={s.colour} /></svg>;
    case "blossom": {   /* the Blossom: an open three-quarter ring ending in the Sahel dot, as in the logo */
      const c = W / 2, r = W / 2 - 13;
      return <svg viewBox={vb}><path d={`M${c + r} ${c} A${r} ${r} 0 1 0 ${c} ${c + r}`} fill="none" stroke={s.colour} strokeWidth={22} strokeLinecap="round" /><circle cx={c} cy={c + r} r={15} fill="#e8935a" /></svg>;
    }
  }
}

export function FooterShapes() {
  const host = useRef<HTMLDivElement | null>(null);
  const els = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const box = host.current; if (!box) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stop = () => {}, started = false, cancelled = false;

    const start = async () => {
      started = true;
      const M = (await import("matter-js")).default as typeof MatterNS;
      if (cancelled) return;
      const { Engine, Bodies, Body, Composite, Constraint, Sleeping } = M;
      const W = box.clientWidth, H = box.clientHeight;
      const u = Math.max(56, Math.min(150, W / 7.2));
      const engine = Engine.create({ enableSleeping: true, gravity: { x: 0, y: 1.15 } });
      const wall = (x: number, y: number, w: number, h: number) => Bodies.rectangle(x, y, w, h, { isStatic: true });
      Composite.add(engine.world, [wall(W / 2, H + 40, W * 3, 80), wall(-40, -H, 80, H * 6), wall(W + 40, -H, 80, H * 6)]);

      /* bodies, dropped from above in a loose row with a little spin */
      const n = SHAPES.length, span = Math.min(W - u, n * u * 0.95);
      const bodies = SHAPES.map((s, i) => {
        const w = s.w * u, h = s.h * u, x = (W - span) / 2 + (span * (i + 0.5)) / n + (Math.random() - 0.5) * u * 0.3;
        const y = -h - Math.random() * H * 0.8 - (i % 3) * u * 0.6;
        const opts = { restitution: 0.25, friction: 0.6, frictionAir: 0.012, density: 0.002, angle: (Math.random() - 0.5) * 0.9 };
        const b = s.kind === "orb" || s.kind === "dot" || s.kind === "blossom" ? Bodies.circle(x, y, w / 2, opts)
          : s.kind === "capsule" ? Bodies.rectangle(x, y, w, h, { ...opts, chamfer: { radius: h / 2 - 1 } })
          : s.kind === "arch" ? Bodies.rectangle(x, y, w, h, { ...opts, chamfer: { radius: [w / 2 - 1, w / 2 - 1, 6, 6] } })
          : Bodies.rectangle(x, y, w, h, { ...opts, chamfer: { radius: Math.min(w, h) * 0.24 } });
        return b;
      });
      Composite.add(engine.world, bodies);
      const size = SHAPES.map(s => [s.w * u, s.h * u]);
      els.current.forEach((el, i) => { if (el) { el.style.width = `${size[i][0]}px`; el.style.height = `${size[i][1]}px`; } });

      const draw = () => bodies.forEach((b, i) => {
        const el = els.current[i]; if (!el) return;
        el.style.transform = `translate(${(b.position.x - size[i][0] / 2).toFixed(1)}px, ${(b.position.y - size[i][1] / 2).toFixed(1)}px) rotate(${b.angle.toFixed(4)}rad)`;
        el.style.opacity = "1";
      });

      if (reduce) { for (let k = 0; k < 900; k++) Engine.update(engine, 1000 / 60); draw(); return; }

      /* dragging: a constraint from the pointer to the point of the shape that was taken */
      let drag: MatterNS.Constraint | null = null, raf = 0, last = 0;
      const loop = (t: number) => {
        Engine.update(engine, Math.min(32, last ? t - last : 16.7)); last = t; draw();
        const asleep = !drag && bodies.every(b => b.isSleeping);
        raf = asleep ? 0 : requestAnimationFrame(loop);
        if (asleep) last = 0;
      };
      const wake = () => { if (!raf) raf = requestAnimationFrame(loop); };
      const at = (e: PointerEvent) => { const r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      const downs = bodies.map((b, i) => {
        const el = els.current[i]!;
        const down = (e: PointerEvent) => {
          e.preventDefault(); el.setPointerCapture(e.pointerId);
          const p = at(e);
          Sleeping.set(b, false);
          const local = { x: p.x - b.position.x, y: p.y - b.position.y }, c = Math.cos(-b.angle), s = Math.sin(-b.angle);
          drag = Constraint.create({ pointA: p, bodyB: b, pointB: { x: local.x * c - local.y * s, y: local.x * s + local.y * c }, stiffness: 0.18, damping: 0.08, length: 0 });
          Composite.add(engine.world, drag); el.classList.add("held"); wake();
        };
        const move = (e: PointerEvent) => { if (drag && drag.bodyB === b) { drag.pointA = at(e); wake(); } };
        const up = () => { if (drag && drag.bodyB === b) { Composite.remove(engine.world, drag); drag = null; el.classList.remove("held"); wake(); } };
        el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
        return () => { el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); };
      });
      /* a body thrown out of the box comes back from the top */
      const keep = setInterval(() => bodies.forEach(b => {
        if (b.position.y > H + 200 || b.position.x < -200 || b.position.x > W + 200) { Body.setPosition(b, { x: W / 2, y: -u }); Body.setVelocity(b, { x: 0, y: 0 }); wake(); }
      }), 1000);
      wake();
      stop = () => { cancelAnimationFrame(raf); clearInterval(keep); downs.forEach(f => f()); Engine.clear(engine); };
    };

    /* drop them when the footer comes into view */
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { void start(); io.disconnect(); } }, { rootMargin: "0px 0px -15% 0px" });
    io.observe(box);
    return () => { cancelled = true; io.disconnect(); stop(); };
  }, []);

  return (
    <div className="ftr-shapes" ref={host} aria-hidden="true">
      {SHAPES.map((s, i) => <div key={i} className={`ftr-shape ${s.kind}`} ref={el => { els.current[i] = el; }}>{art(s)}</div>)}
    </div>
  );
}
