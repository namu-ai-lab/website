"use client";

/* The footer's toy, after labs.google's own (its app-falling-elements component, also matter-js), whose numbers this
   follows: the shapes' size for the width of the screen, the box's proportions, the engine's 180 steps a second, the
   bodies' friction and bounce, the soft drag, the hop when the cursor touches a shape, the shove when the page is
   scrolled or the window moved, and the fade in. Like labs.google's, the shapes are flat and still until someone
   touches them, and in Namu's own colours. They are the Lab's own: a greeting in each of the four languages it works
   in (Hausa sannu, Zarma fofo, Fulfulde jam, and Tamasheq alxer written in Tifinagh), the granary and the measuring
   bowl that two of its research programmes are named after (Rumbu, Maʼauni), the Aïr massif its voice agent is
   named after, and the Blossom of the logo. The shapes drop in from above; once they are in, the ceiling comes down
   to the footer's top edge, so a shape can be lifted above the line, as on labs.google, but never out of the
   footer. */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type * as MatterNS from "matter-js";

type Kind = "greet" | "granary" | "bowl" | "massif" | "blossom";
/* w and h in units of S, the size of one shape (labs.google's 280 px, scaled for the screen's width); a greeting has its
   word, its language and the side its tail points to */
type Def = { kind: Kind; w: number; h: number; fill: string; ink?: string; word?: string; lang?: string; tail?: "left" | "right"; phone?: boolean };
const greet = (word: string, lang: string, fill: string, ink: string, tail: "left" | "right"): Def => ({ kind: "greet", w: 1.12, h: 0.94, fill, ink, word, lang, tail, phone: true });

/* Tamasheq "alxer" in Tifinagh (ⴰⵍⵅⴻⵔ, Unicode's letters), as one outline cut from Noto Sans Tifinagh (SIL Open Font
   Licence), so it reads the same on every device whether or not a Tifinagh font is installed */
const TIFINAGH = { d: "M242 10C354 10 434 -60 434 -181C434 -302 354 -373 242 -373C130 -373 50 -302 50 -181C50 -60 130 10 242 10ZM242 -68C176 -68 139 -112 139 -181C139 -250 173 -295 242 -295C309 -295 345 -250 345 -181C345 -112 309 -68 242 -68ZM581 0H670V-131L804 -344C832 -389 851 -422 866 -463L871 -461C865 -425 864 -377 864 -310V0H953V-714H864V-584L728 -369C702 -328 685 -298 668 -252L663 -254C669 -290 670 -338 670 -405V-714H581ZM1084 0H1174L1278 -155C1313 -207 1354 -263 1364 -299H1369C1380 -264 1423 -199 1452 -155L1555 0H1657V-8L1420 -365L1650 -706V-714H1560L1490 -610C1457 -562 1430 -525 1404 -458L1399 -460C1412 -541 1411 -575 1411 -639V-714H1326V-639C1326 -575 1327 -539 1345 -460L1340 -458C1313 -523 1292 -559 1259 -608L1188 -714H1086V-706L1319 -357L1084 -8ZM1969 -460C2069 -460 2125 -512 2125 -592C2125 -673 2069 -725 1969 -725C1869 -725 1813 -673 1813 -592C1813 -512 1869 -460 1969 -460ZM1969 -534C1922 -534 1900 -557 1900 -592C1900 -627 1922 -650 1969 -650C2016 -650 2038 -627 2038 -592C2038 -557 2016 -534 1969 -534ZM1739 -318H2199V-397H1739ZM1969 10C2069 10 2125 -42 2125 -122C2125 -203 2069 -255 1969 -255C1869 -255 1813 -203 1813 -122C1813 -42 1869 10 1969 10ZM1969 -64C1923 -64 1900 -87 1900 -122C1900 -157 1922 -180 1969 -180C2016 -180 2038 -157 2038 -122C2038 -87 2016 -64 1969 -64ZM2638 10C2844 10 2968 -137 2968 -357C2968 -577 2842 -725 2638 -725C2434 -725 2309 -577 2309 -357C2309 -137 2432 10 2638 10ZM2638 -72C2485 -72 2404 -177 2404 -357C2404 -537 2484 -643 2638 -643C2792 -643 2873 -537 2873 -357C2873 -177 2791 -72 2638 -72Z", x: 15.663, y: 46.556, s: 0.026731 };

/* Namu's palette: ink, kola, dry clay, muted, paper, and the Sahel orange for heat */
const INK = "#1c1410", KOLA = "#6b3e1e", CLAY = "#edd9b0", CLAY_DEEP = "#4a2a12", MUTED = "#7a6352", PAPER = "#fffaf1", SAHEL = "#e8935a";

/* Wider screens get all eight; up to 1024 px, as on labs.google, five (`phone`). */
/* greetings in the four languages (to be checked by native speakers): Hausa and Zarma "hello", Fulfulde and
   Tamasheq "peace", which is how a greeting opens and answers in both */
const SHAPES: Def[] = [
  greet("sannu", "ha", SAHEL, INK, "left"),
  { kind: "granary", w: 1, h: 0.86, fill: MUTED },
  greet("fofo", "dje", CLAY, KOLA, "right"),
  { kind: "massif", w: 1.2, h: 0.8, fill: CLAY_DEEP },
  { kind: "blossom", w: 0.94, h: 0.94, fill: INK, phone: true },
  greet("jam", "ff", KOLA, PAPER, "left"),
  { kind: "bowl", w: 1, h: 0.6, fill: SAHEL },
  greet("alxer", "taq", INK, PAPER, "right"),
];

/* outlines in viewBox units (100 to S); the physics holds these exact edges */
const OUTLINE = {
  left: "M22 0H90Q112 0 112 22V52Q112 74 90 74H46L21 94L25 74H22Q0 74 0 52V22Q0 0 22 0Z",
  right: "M90 0H22Q0 0 0 22V52Q0 74 22 74H66L91 94L87 74H90Q112 74 112 52V22Q112 0 90 0Z",
  /* a round clay granary under a thatched cone, as across the Sahel */
  granary: "M46.5 3Q50 0 53.5 3L97 37Q100 41 95 41H88V72Q88 84 76 84H24Q12 84 12 72V41H5Q0 41 3 37Z",
  /* a grain-measuring bowl, its rim on top */
  bowl: "M0 4Q0 0 4 0H96Q100 0 100 4V8Q98 8 96 10Q86 60 50 60Q14 60 4 10Q2 8 0 8Z",
  /* the Aïr: two worn granite domes */
  massif: "M0 80L34 12Q40 2 46 12L60 36L74 20Q80 12 86 20L120 80Z",
} as const;

function art(s: Def): ReactNode {
  const W = s.w * 100, H = s.h * 100, vb = `0 0 ${W} ${H}`;
  switch (s.kind) {
    case "greet":                 /* a greeting, and the language it is in */
      return <svg viewBox={vb}><path className="hit" d={OUTLINE[s.tail!]} fill={s.fill} />
        {s.lang === "taq"
          ? <path d={TIFINAGH.d} fill={s.ink} transform={`translate(${TIFINAGH.x} ${TIFINAGH.y}) scale(${TIFINAGH.s})`} />
          : <text x={56} y={38} lang={s.lang} textAnchor="middle" dominantBaseline="central" fontSize={27} fontWeight={600} letterSpacing={-0.6} fill={s.ink}>{s.word}</text>}</svg>;
    case "granary":               /* Rumbu: clay below, the thatch and its bands above */
      return <svg viewBox={vb}><path className="hit" d={OUTLINE.granary} fill={s.fill} />
        <path d="M46.5 3Q50 0 53.5 3L97 37Q100 41 95 41H5Q0 41 3 37Z" fill={CLAY} />
        <path d="M30 19H70M17 30H83" stroke={INK} strokeWidth={2.6} strokeLinecap="round" opacity={0.45} />
        <path d="M12 60H88" stroke={INK} strokeWidth={2.6} opacity={0.3} /></svg>;
    case "bowl":                  /* Maʼauni: a bowl that measures, marked on its side */
      return <svg viewBox={vb}><path className="hit" d={OUTLINE.bowl} fill={s.fill} />
        <path d="M0 4Q0 0 4 0H96Q100 0 100 4V8H0Z" fill={KOLA} />
        <path d="M70 22H80M72 32H80M75 42H80" stroke={INK} strokeWidth={2.6} strokeLinecap="round" opacity={0.6} /></svg>;
    case "massif":                /* Aïr */
      return <svg viewBox={vb}><path className="hit" d={OUTLINE.massif} fill={s.fill} /></svg>;
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
    type Drag = { i: number; body: MatterNS.Body; id: number; c: MatterNS.Constraint; x0: number; y0: number; t0: number; moved: boolean; touch: boolean; reach: number };
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
        if (s.kind === "blossom") return [Bodies.circle(x, y, w / 2, { ...BODY }), { x: 0, y: 0 }];
        const pts = sample(OUTLINE[s.kind === "greet" ? s.tail! : s.kind], w / (s.w * 100)), c = Vertices.centre(pts);
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
      /* the footer's top edge, above the box: once every shape has dropped in below it, the ceiling comes down to it, so no
         shape can be thrown or dragged out of the footer */
      const ftr = box!.closest("footer");
      const roof = ftr ? Math.max(0, box!.getBoundingClientRect().top - ftr.getBoundingClientRect().top) : 0;

      const engine = Engine.create({ positionIterations: 10, velocityIterations: 10 });
      let top = ceiling;                                   // until the shapes are in, the ceiling stays high above
      const walls = (h: number) => [
        Bodies.rectangle(W / 2, h + WALL / 2, W + 2 * WALL, WALL, { isStatic: true, friction: 0.95, frictionStatic: 1 }),
        Bodies.rectangle(W / 2, -top - WALL / 2, W + 2 * WALL, WALL, { isStatic: true }),
        Bodies.rectangle(-WALL / 2, (h - top) / 2, WALL, h + top + WALL, { isStatic: true }),
        Bodies.rectangle(W + WALL / 2, (h - top) / 2, WALL, h + top + WALL, { isStatic: true }),
      ];
      let fence = walls(H);
      Composite.add(engine.world, [...fence, ...live.map(i => bodies[i])]);
      if (reduce) for (let k = 0; k < 2400; k++) Engine.update(engine, STEP);   // shown at rest
      const sim = {
        engine, bodies, offset, size, live, ceiling, roof, W, H, closed: false, born: performance.now(),
        resize(h: number) { Composite.remove(engine.world, fence); fence = walls(h); Composite.add(engine.world, fence); this.H = h; },
        /* bring the ceiling down to the footer's top edge once nothing is above it; four seconds after the drop, or once
           the pile has settled, close it anyway, just over the highest shape */
        close(force = false) {
          if (this.closed) return;
          const highest = Math.min(...live.map(i => bodies[i].bounds.min.y));
          if (!force && highest <= -roof + 1) return;
          this.closed = true; top = Math.max(roof, -highest + 2); this.resize(this.H);
        },
        stop() { Composite.clear(engine.world, false); Engine.clear(engine); },
      };
      if (reduce) sim.close();
      return sim;
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
      sim.close(now - sim.born > 4000);
      acc += dt; let k = 0;
      while (acc >= STEP && k < 9) { beforeStep(); M!.Engine.update(sim.engine, STEP); acc -= STEP; k++; }
      if (k >= 9) acc = 0;
      render();
      const still = sim.live.every(i => { const b = sim!.bodies[i]; return b.speed < 0.05 && b.angularSpeed < 0.002; });
      stillMs = still ? stillMs + dt : 0;
      if (stillMs > 800) { paused = true; sim.close(true); }
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
      /* how far the shape reaches from the point that was taken, whichever way it turns */
      const reach = Math.max(...b.vertices.map(v => Math.hypot(v.x - p.x, v.y - p.y)));
      drag = { i, body: b, id: e.pointerId, c, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false, touch: e.pointerType !== "mouse", reach };
      box.classList.add("is-dragging"); el.classList.add("held");
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || drag?.id === e.pointerId) { const p = at(e); ptr.x = p.x; ptr.y = p.y; }
      if (!drag || e.pointerId !== drag.id) return;
      /* the pull stops short of the footer's edges by the shape's reach, so no part of it is pressed through them */
      const r = Math.min(drag.reach, sim!.W / 2);
      drag.c.pointA = { x: Math.min(sim!.W - r, Math.max(r, ptr.x)), y: Math.min(sim!.H, Math.max(-sim!.roof + drag.reach, ptr.y)) };
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
