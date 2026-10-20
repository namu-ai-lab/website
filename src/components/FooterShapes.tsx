"use client";

/* The footer's toy, after labs.google's own (its app-falling-elements component, also matter-js), whose numbers this
   follows: the shapes' size for the width of the screen, the box's proportions, the engine's 180 steps a second, the
   bodies' friction and bounce, the soft drag, the hop when the cursor touches a shape, the shove when the page is
   scrolled or the window moved, and the fade in. Like labs.google's, the shapes are flat and still until someone
   touches them. Each is a thing the Lab is named after. Three of its research programmes follow grain through a
   Sahel household, the way the Lab treats speech: the granary that keeps it (Rumbu), the sieve that sifts it
   (Tankaɗe), the bowl that measures it (Maʼauni). Hira, conversation, is a greeting and its answer, "sannu" and
   "yauwa". Aïr is the massif it is named after, Kora the calabash harp, and the Blossom is the logo. As on
   labs.google the box is open at the top, so a shape lifted above the line stays in sight, and walls at the sides
   and a ceiling high above keep every shape on the page. */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type * as MatterNS from "matter-js";

type Kind = "ask" | "answer" | "granary" | "sieve" | "bowl" | "massif" | "kora" | "blossom";
/* w and h in units of S, the size of one shape (labs.google's 280 px, scaled for the screen's width) */
type Def = { kind: Kind; w: number; h: number; fill: string; phone?: boolean };

const INK = "#2b2622", SAHEL = "#e8935a", STRAW = "#ffbe48";

/* Wider screens get all eight; up to 1024 px, as on labs.google, five (`phone`). */
const SHAPES: Def[] = [
  { kind: "ask", w: 1.12, h: 0.94, fill: "#7c9bd2", phone: true },
  { kind: "granary", w: 0.96, h: 1, fill: "#c8643b", phone: true },
  { kind: "sieve", w: 0.9, h: 0.9, fill: "#c29be0" },
  { kind: "massif", w: 1.2, h: 0.8, fill: "#2e3f6b" },
  { kind: "blossom", w: 0.94, h: 0.94, fill: INK, phone: true },
  { kind: "kora", w: 0.7, h: 1, fill: STRAW, phone: true },
  { kind: "bowl", w: 1, h: 0.6, fill: "#f0884f" },
  { kind: "answer", w: 1.12, h: 0.94, fill: "#f5a3bb", phone: true },
];

/* outlines in viewBox units (100 to S); the physics holds these exact edges */
const OUTLINE = {
  ask: "M22 0H90Q112 0 112 22V52Q112 74 90 74H46L21 94L25 74H22Q0 74 0 52V22Q0 0 22 0Z",
  answer: "M90 0H22Q0 0 0 22V52Q0 74 22 74H66L91 94L87 74H90Q112 74 112 52V22Q112 0 90 0Z",
  /* a round clay granary under a thatched cone, as across the Sahel */
  granary: "M44.5 3Q48 0 51.5 3L93 43Q96 47 91 47H84V82Q84 98 66 98H30Q12 98 12 82V47H5Q0 47 3 43Z",
  /* a grain-measuring bowl, its rim on top */
  bowl: "M0 4Q0 0 4 0H96Q100 0 100 4V8Q98 8 96 10Q86 60 50 60Q14 60 4 10Q2 8 0 8Z",
  /* the Aïr: two worn granite domes */
  massif: "M0 80L34 12Q40 2 46 12L60 36L74 20Q80 12 86 20L120 80Z",
  /* the kora: a long neck through a calabash */
  kora: "M31 4Q31 0 35 0Q39 0 39 4V36.25A32 32 0 1 1 31 36.25Z",
} as const;

function art(s: Def): ReactNode {
  const W = s.w * 100, H = s.h * 100, vb = `0 0 ${W} ${H}`;
  switch (s.kind) {
    case "ask": case "answer":    /* Hira: a greeting and its answer */
      return <svg viewBox={vb}><path className="hit" d={OUTLINE[s.kind]} fill={s.fill} />
        <text x={56} y={38} lang="ha" textAnchor="middle" dominantBaseline="central" fontSize={27} fontWeight={600} letterSpacing={-0.6} fill={INK}>{s.kind === "ask" ? "sannu" : "yauwa"}</text></svg>;
    case "granary":               /* Rumbu: clay below, the thatch and its bands above */
      return <svg viewBox={vb}><path className="hit" d={OUTLINE.granary} fill={s.fill} />
        <path d="M44.5 3Q48 0 51.5 3L93 43Q96 47 91 47H5Q0 47 3 43Z" fill={STRAW} />
        <path d="M27 24H69M15 35H81" stroke={INK} strokeWidth={2.6} strokeLinecap="round" opacity={0.5} />
        <path d="M12 66H84" stroke={INK} strokeWidth={2.6} opacity={0.3} /></svg>;
    case "sieve":                 /* Tankaɗe: a woven tray for sifting */
      return <svg viewBox={vb}><defs><clipPath id="ftr-sieve"><circle cx={45} cy={45} r={34} /></clipPath></defs>
        <circle className="hit" cx={45} cy={45} r={45} fill={s.fill} />
        <g clipPath="url(#ftr-sieve)" stroke={INK} strokeWidth={1.8} opacity={0.5}>
          {Array.from({ length: 13 }, (_, k) => { const o = -36 + k * 12; return <g key={k}><path d={`M${o} 0L${o + 90} 90`} /><path d={`M${o + 90} 0L${o} 90`} /></g>; })}
        </g>
        <circle cx={45} cy={45} r={34} fill="none" stroke={INK} strokeWidth={2.4} opacity={0.6} /></svg>;
    case "bowl":                  /* Maʼauni: a bowl that measures, marked on its side */
      return <svg viewBox={vb}><path className="hit" d={OUTLINE.bowl} fill={s.fill} />
        <path d="M0 4Q0 0 4 0H96Q100 0 100 4V8H0Z" fill="#c8643b" />
        <path d="M70 22H80M72 32H80M75 42H80" stroke={INK} strokeWidth={2.6} strokeLinecap="round" opacity={0.6} /></svg>;
    case "massif":                /* Aïr */
      return <svg viewBox={vb}><path className="hit" d={OUTLINE.massif} fill={s.fill} /></svg>;
    case "kora":                  /* Kora: the calabash, its skin, its strings */
      return <svg viewBox={vb}><path className="hit" d={OUTLINE.kora} fill={INK} />
        <circle cx={35} cy={68} r={27} fill={s.fill} />
        <path d="M33 6L28 78M35 6V80M37 6L42 78" stroke={INK} strokeWidth={1.3} opacity={0.8} />
        <rect x={31} y={72} width={8} height={11} rx={2} fill={INK} /></svg>;
    case "blossom":               /* the logo's open three-quarter ring, ending in the Sahel dot */
      return <svg viewBox="0 0 100 100"><circle className="hit" cx={50} cy={50} r={50} fill="none" /><path d="M87 50A37 37 0 1 0 50 87" fill="none" stroke={s.fill} strokeWidth={20} strokeLinecap="round" /><circle cx={50} cy={87} r={13} fill={SAHEL} /></svg>;
  }
}

/* labs.google's numbers */
const STEP = 1000 / 180;                                  // the engine's fixed step
const BODY = { friction: 0.618, frictionStatic: 0.986, frictionAir: 0.011, restitution: 0.34, density: 0.01 };
const DRAG = { stiffness: 0.055, damping: 0.618, maxSpeed: 8 };
const HOP = { range: 80, hop: 9.75, near: 4.5, edge: 0.4, minSpeed: 2.5, fullSpeed: 8, spread: 0.15, escape: 1.2, escapeChance: 0.18 };
const SCROLL = { factor: 0.7, max: 20, jump: 1200, dead: 1, maxVy: 10 };
const WINDOW = { factor: 0.5, max: 9, jump: 250, dead: 3 };
const WALL = 500, CEILING = 1000;
const scaleFor = (vw: number) => (vw > 1024 ? 1.146 : vw > 768 ? 0.592 : vw > 600 ? 0.75 : vw > 400 ? 0.45 : 0.366);
const smooth = (x: number) => x * x * (3 - 2 * x);
const dead = (x: number, d: number) => (Math.abs(x) <= d ? 0 : (Math.abs(x) - d) * Math.sign(x));

export function FooterShapes() {
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const box = host.current; if (!box) return;
    const els: HTMLElement[] = [];
    box.querySelectorAll<HTMLElement>("[data-i]").forEach(el => { els[Number(el.dataset.i)] = el; });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hover = window.matchMedia("(hover: hover)").matches;
    let M: typeof MatterNS | null = null;
    let sim: Sim | null = null;
    let raf = 0, started = false, cancelled = false, last = 0, acc = 0, builtFor = 0, resizeT = 0;
    const ptr = { x: -1e5, y: -1e5, px: -1e5, py: -1e5, inside: false };
    type Drag = { i: number; body: MatterNS.Body; id: number; c: MatterNS.Constraint; x0: number; y0: number; t0: number; moved: boolean; touch: boolean };
    let drag: Drag | null = null;
    let probe: SVGPathElement | null = null;

    /* points along an outline, about every 30 px as labs.google samples its shapes, and never fewer than 40, so a small
       shape on a phone keeps its curves */
    const sample = (d: string, scale: number) => {
      if (!probe) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("aria-hidden", "true"); svg.style.cssText = "position:absolute;width:0;height:0;visibility:hidden";
        probe = document.createElementNS("http://www.w3.org/2000/svg", "path"); svg.appendChild(probe); document.body.appendChild(svg);
      }
      probe.setAttribute("d", d);
      const len = probe.getTotalLength(), n = Math.max(40, Math.floor((len * scale) / 30)), out: MatterNS.Vector[] = [];
      for (let k = 0; k < n; k++) { const p = probe.getPointAtLength((k * len) / n); out.push({ x: p.x * scale, y: p.y * scale }); }
      return out;
    };

    type Sim = ReturnType<typeof build>;
    function build() {
      const { Engine, Bodies, Body, Composite, Vertices } = M!;
      const vw = window.innerWidth, W = box!.clientWidth, H = box!.clientHeight;
      builtFor = vw;
      const S = (280 * scaleFor(vw) * W) / Math.max(1, vw - 48);
      box!.style.setProperty("--S", `${S.toFixed(2)}px`);
      const live = SHAPES.map((s, i) => (vw > 1024 || s.phone ? i : -1)).filter(i => i >= 0);
      els.forEach((el, i) => { el.hidden = !live.includes(i); });
      const size = SHAPES.map(s => [s.w * S, s.h * S]);

      /* each body, and where the middle of its picture sits relative to the body's centre of mass */
      const body = (i: number, x: number, y: number): [MatterNS.Body, MatterNS.Vector] => {
        const s = SHAPES[i], [w, h] = size[i];
        if (s.kind === "blossom" || s.kind === "sieve") return [Bodies.circle(x, y, w / 2, { ...BODY }), { x: 0, y: 0 }];
        const pts = sample(OUTLINE[s.kind], w / (s.w * 100)), c = Vertices.centre(pts);
        return [Bodies.fromVertices(x, y, [pts], { ...BODY }, true), { x: w / 2 - c.x, y: h / 2 - c.y }];
      };

      /* spawn as labs.google does: shuffled, spread evenly across the width with a little jitter; each one placed
         as low above the box as it fits, so nothing starts inside another */
      const order = [...live];
      for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
      const xs = order.map((_, f) => (W / (order.length + 1)) * (f + 1));
      const placed: { x: number; y: number; r: number }[] = [];
      const bodies: MatterNS.Body[] = [], offset: MatterNS.Vector[] = [];
      order.forEach((i, f) => {
        const r = Math.max(...size[i]) / 2;
        const gap = Math.min(Infinity, ...xs.filter((_, g) => g !== f).map(x => Math.abs(x - xs[f])));
        const jitter = Math.max(0, Math.min(gap * 0.5, xs[f] - r, W - xs[f] - r));
        const x = Math.min(W - r, Math.max(r, xs[f] + (Math.random() - 0.5) * 2 * jitter));
        let y = -150 - r;
        for (const q of placed) { const dx = Math.abs(x - q.x), d = r + q.r + 6; if (dx < d) y = Math.min(y, q.y - Math.sqrt(d * d - dx * dx)); }
        placed.push({ x, y, r });
        const [b, o] = body(i, x, y);
        Body.setAngle(b, (Math.random() - 0.5) * 0.5);
        bodies[i] = b; offset[i] = o;
        els[i].style.setProperty("--k", String(f));
      });
      const ceiling = Math.max(CEILING, 200 - Math.min(...placed.map(p => p.y - p.r)));

      const engine = Engine.create({ positionIterations: 10, velocityIterations: 10 });
      const walls = (h: number) => [
        Bodies.rectangle(W / 2, h + WALL / 2, W + 2 * WALL, WALL, { isStatic: true, friction: 0.95, frictionStatic: 1 }),
        Bodies.rectangle(W / 2, -ceiling - WALL / 2, W + 2 * WALL, WALL, { isStatic: true }),
        Bodies.rectangle(-WALL / 2, (h - ceiling) / 2, WALL, h + ceiling + WALL, { isStatic: true }),
        Bodies.rectangle(W + WALL / 2, (h - ceiling) / 2, WALL, h + ceiling + WALL, { isStatic: true }),
      ];
      let fence = walls(H);
      Composite.add(engine.world, [...fence, ...live.map(i => bodies[i])]);
      if (reduce) for (let k = 0; k < 2400; k++) Engine.update(engine, STEP);   // shown at rest
      return {
        engine, bodies, offset, size, live, ceiling, H,
        resize(h: number) { Composite.remove(engine.world, fence); fence = walls(h); Composite.add(engine.world, fence); this.H = h; },
        stop() { Composite.clear(engine.world, false); Engine.clear(engine); },
      };
    }

    function show() {
      box!.classList.add("on");
      if (reduce) return;
      for (const i of sim!.live) { const el = els[i]; el.classList.remove("in"); void el.offsetWidth; el.classList.add("in"); }
    }

    /* a hop and a shake, labs.google's "tickle" */
    const hop = (b: MatterNS.Body, strength: number) => {
      const { Body } = M!;
      wake();
      const spread = Math.random() < HOP.escapeChance ? HOP.escape : HOP.spread, a = (Math.random() - 0.5) * 2 * spread;
      const vy = -Math.cos(a) * HOP.hop * strength, vx = Math.sin(a) * HOP.hop * strength;
      Body.setVelocity(b, { x: vx > 0 ? Math.max(b.velocity.x, vx) : vx < 0 ? Math.min(b.velocity.x, vx) : b.velocity.x, y: Math.min(b.velocity.y, vy) });
      let w = 0.09 * strength * (Math.random() < 0.5 ? -1 : 1);
      for (let k = 0; k < 3; k++, w *= -0.6) { const v = w; window.setTimeout(() => Body.setAngularVelocity(b, v), k * 90); }
    };
    const wasIn: boolean[] = [], wasNear: boolean[] = [];
    function tickle(moved: number) {
      const { Vertices } = M!;
      for (const i of sim!.live) {
        const b = sim!.bodies[i];
        const c = Math.hypot(ptr.x - b.position.x, ptr.y - b.position.y), half = Math.max(...sim!.size[i]) / 2;
        const inside = Vertices.contains(b.vertices, ptr), near = !inside && c < HOP.range;
        let d = 0;
        if (inside && !wasIn[i]) d = 1 - smooth(Math.min(c / half, 1)) * (1 - HOP.edge);
        else if (near && !wasNear[i] && moved >= HOP.minSpeed) d = (HOP.near / HOP.hop) * smooth((HOP.range - c) / HOP.range) * Math.min(moved / HOP.fullSpeed, 1);
        if (d > 0) hop(b, d);
        wasIn[i] = inside; wasNear[i] = near;
      }
    }

    function beforeStep() {
      const { Body } = M!;
      const moved = Math.hypot(ptr.x - ptr.px, ptr.y - ptr.py);
      if (drag) {
        const v = drag.body.velocity, c = Math.hypot(v.x, v.y);
        if (moved < 1 && c > 0.5) Body.setVelocity(drag.body, { x: v.x * 0.6, y: v.y * 0.6 });
        else if (c > DRAG.maxSpeed) Body.setVelocity(drag.body, { x: (v.x * DRAG.maxSpeed) / c, y: (v.y * DRAG.maxSpeed) / c });
      }
      ptr.px = ptr.x; ptr.py = ptr.y;
      if (hover && !reduce && ptr.inside && !drag) tickle(moved);
    }

    /* the pile feels the page move: scrolling (resting shapes only) and moving the window */
    function kick(x: number, y: number, scroll: boolean) {
      const { Body } = M!;
      for (const i of sim!.live) {
        const b = sim!.bodies[i]; if (drag?.body === b) continue;
        const rest = b.bounds.max.y >= sim!.H - 6 && Math.abs(b.velocity.y) < 0.8;
        if (scroll && !rest) continue;
        let u = y * (scroll && rest && y > 0 ? 0.25 : 1);
        if (scroll && u) { const p = b.velocity.y; u = u > 0 ? (p >= SCROLL.maxVy ? 0 : Math.min(u, SCROLL.maxVy - p)) : (p <= -SCROLL.maxVy ? 0 : Math.max(u, -SCROLL.maxVy - p)); }
        wake();
        Body.setVelocity(b, { x: b.velocity.x + x * (rest ? 0.35 : 1), y: b.velocity.y + u });
      }
    }
    const tracker = (T: typeof WINDOW, read: () => { x: number; y: number }, scroll: boolean) => {
      let s = read(), lx = 0, ly = 0, was = false;
      return (visible: boolean) => {
        const d = read(), h = d.x - s.x, m = d.y - s.y; s = d;
        if (visible && !was) { lx = 0; ly = 0; } was = visible;
        const jump = Math.abs(h) > T.jump || Math.abs(m) > T.jump;
        if (!jump && visible) {
          let ax = dead(h - lx, T.dead), ay = dead(m - ly, T.dead);
          if (scroll) { if (Math.sign(ax) !== Math.sign(h)) ax = 0; if (Math.sign(ay) !== Math.sign(m)) ay = 0; }
          if (ax || ay) { let kx = -ax * T.factor, ky = -ay * T.factor; const l = Math.hypot(kx, ky); if (l > T.max) { kx *= T.max / l; ky *= T.max / l; } kick(kx, ky, scroll); }
        }
        lx = jump ? 0 : h; ly = jump ? 0 : m;
      };
    };
    const onScroll = tracker(SCROLL, () => ({ x: window.scrollX, y: window.scrollY }), true);
    const onWindow = tracker(WINDOW, () => ({ x: window.screenX, y: window.screenY }), false);

    function render() {
      for (const i of sim!.live) {
        const b = sim!.bodies[i], o = sim!.offset[i], [w, h] = sim!.size[i], c = Math.cos(b.angle), s = Math.sin(b.angle);
        els[i].style.transform = `translate(${(b.position.x + o.x * c - o.y * s - w / 2).toFixed(2)}px, ${(b.position.y + o.x * s + o.y * c - h / 2).toFixed(2)}px) rotate(${b.angle.toFixed(4)}rad)`;
      }
    }

    /* nothing moves on its own: once every shape has been still for most of a second the simulation pauses, and it
       resumes when a shape is touched, thrown, hovered or shoved by the page moving */
    let paused = false, stillMs = 0;
    function wake() { paused = false; stillMs = 0; }
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!sim) return;
      const r = box.getBoundingClientRect();
      if (document.hidden || r.top > window.innerHeight * 1.5 || r.bottom < -sim.ceiling) { last = 0; return; }
      const dt = last ? Math.min(50, now - last) : STEP; last = now;
      if (hover && !reduce) { const seen = r.top <= window.innerHeight && r.bottom >= 0; onScroll(seen); onWindow(seen); }
      if (drag || ptr.inside) wake();
      if (paused) { acc = 0; return; }
      acc += dt; let k = 0;
      while (acc >= STEP && k < 9) { beforeStep(); M!.Engine.update(sim.engine, STEP); acc -= STEP; k++; }
      if (k >= 9) acc = 0;
      render();
      const still = sim.live.every(i => { const b = sim!.bodies[i]; return b.speed < 0.05 && b.angularSpeed < 0.002; });
      stillMs = still ? stillMs + dt : 0;
      if (stillMs > 800) paused = true;
    };

    /* the pointer: a constraint from the finger or cursor to the point of the shape that was taken */
    const at = (e: PointerEvent) => { const r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const onDown = (e: PointerEvent) => {
      if (!sim || drag || e.button !== 0) return;
      const el = (e.target as Element).closest<HTMLElement>("[data-i]");
      if (!el || !box.contains(el)) return;
      const i = Number(el.dataset.i), b = sim.bodies[i]; if (!b || !sim.live.includes(i)) return;
      if (e.pointerType === "mouse") e.preventDefault();          // no text selection
      const p = at(e); ptr.x = ptr.px = p.x; ptr.y = ptr.py = p.y;
      wake();
      const c = M!.Constraint.create({ pointA: { ...p }, bodyB: b, pointB: { x: p.x - b.position.x, y: p.y - b.position.y }, stiffness: DRAG.stiffness, damping: DRAG.damping, length: 0.01 });
      M!.Composite.add(sim.engine.world, c);
      drag = { i, body: b, id: e.pointerId, c, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false, touch: e.pointerType !== "mouse" };
      box.classList.add("is-dragging"); el.classList.add("held");
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || drag?.id === e.pointerId) { const p = at(e); ptr.x = p.x; ptr.y = p.y; }
      if (!drag || e.pointerId !== drag.id) return;
      drag.c.pointA = { x: ptr.x, y: ptr.y };
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) drag.moved = true;
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id || !sim) return;
      M!.Composite.remove(sim.engine.world, drag.c);
      els[drag.i].classList.remove("held"); box.classList.remove("is-dragging");
      if (!drag.moved && drag.touch && performance.now() - drag.t0 < 450) hop(drag.body, 1);   // a tap on a phone: a hop
      drag = null;
    };
    const onEnter = (e: PointerEvent) => { if (e.pointerType === "mouse") ptr.inside = true; };
    const onLeave = (e: PointerEvent) => { if (e.pointerType === "mouse") { ptr.inside = false; wasIn.length = 0; wasNear.length = 0; } };

    async function start() {
      if (started) return;
      started = true;
      const [{ default: Matter }, decomp] = await Promise.all([import("matter-js"), import("poly-decomp")]);
      if (cancelled) return;
      M = Matter as typeof MatterNS;
      M.Common.setDecomp((decomp as { default?: unknown }).default ?? decomp);
      sim = build(); show();
      raf = requestAnimationFrame(frame);
    }
    const check = () => {
      if (started) return;
      const r = box.getBoundingClientRect();
      if (box.clientWidth && r.top <= window.innerHeight * 1.5 && r.bottom >= 0) { window.removeEventListener("scroll", check); void start(); }
    };
    const onResize = () => {
      if (!sim || window.innerWidth === builtFor) return;
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(() => { if (!sim || cancelled) return; sim.stop(); drag = null; sim = build(); show(); }, 200);
    };
    const ro = new ResizeObserver(() => { if (sim && Math.abs(box.clientHeight - sim.H) >= 1 && window.innerWidth === builtFor) sim.resize(box.clientHeight); });

    box.addEventListener("pointerdown", onDown);
    box.addEventListener("pointerenter", onEnter); box.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", onResize);
    ro.observe(box);
    check();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf); window.clearTimeout(resizeT); ro.disconnect();
      box.removeEventListener("pointerdown", onDown);
      box.removeEventListener("pointerenter", onEnter); box.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("scroll", check); window.removeEventListener("resize", onResize);
      sim?.stop(); sim = null;
      probe?.parentElement?.remove();
    };
  }, []);

  return (
    <div className="ftr-pile" ref={host} aria-hidden="true">
      {SHAPES.map((s, i) => (
        <div key={i} className={`ftr-shape is-${s.kind}`} data-i={i} style={{ ["--w" as string]: s.w, ["--h" as string]: s.h } as CSSProperties}>
          <div className="ftr-in">{art(s)}</div>
        </div>
      ))}
    </div>
  );
}
