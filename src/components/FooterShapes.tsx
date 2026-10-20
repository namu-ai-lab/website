"use client";

/* The footer's toy, after labs.google's own (its app-falling-elements component, also matter-js), whose numbers this
   follows: the shapes' size for the width of the screen, the box's proportions, the engine's 180 steps a second, the
   bodies' friction and bounce, the soft drag, the hop when the cursor touches a shape, the shove when the page is
   scrolled or the window moved, and the fade in. The shapes are Namu's: two voice orbs whose paint turns as they roll
   and stirs when they are thrown, the Blossom with its Sahel dot, a speech bubble that says sannu, a doorway of the
   Sahel's earth architecture, a voice note, and two of the letters only Hausa's alphabet has, ƙ and ɗ, cut from the
   site's own type. When the two voices touch they talk: they hop, and their paint stirs. Among them lie five small dark
   discs, the Lab's GitHub, LinkedIn, X, Instagram and email; a tap opens them, and they can be thrown like the rest.
   As on labs.google the box is open at the top, so a shape lifted above the line stays in sight, and walls at the
   sides and a ceiling high above keep every shape on the page. */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type * as MatterNS from "matter-js";
import { createOrbRenderer, type OrbRenderer } from "@/lib/orbGL";
import { voices } from "@/content/playground";
import { GLYPHS, type GlyphId } from "./footerGlyphs";

type Kind = "orb" | "blossom" | "bubble" | "arch" | "wave" | "letter" | "social";
type Net = "github" | "linkedin" | "x" | "instagram" | "mail";
/* w and h in units of S, the size of one shape (labs.google's 280 px, scaled for the screen's width) */
type Def = { kind: Kind; w: number; h: number; fill?: string; voice?: number; glyph?: GlyphId; net?: Net; phone?: boolean };

const INK = "#2b2622", SAHEL = "#e8935a";
const letter = (glyph: GlyphId, h: number, fill: string, phone?: boolean): Def =>
  ({ kind: "letter", glyph, h, w: (h * GLYPHS[glyph].w) / GLYPHS[glyph].h, fill, phone });
const disc = (net: Net): Def => ({ kind: "social", net, w: 0.36, h: 0.36, phone: true });

/* Wider screens get all of them; up to 1024 px, as on labs.google, a smaller set (`phone`). */
const SHAPES: Def[] = [
  { kind: "orb", w: 1, h: 1, voice: 0, phone: true },
  letter("k", 0.92, "#f0884f", true),
  { kind: "bubble", w: 1.12, h: 0.94, fill: "#7c9bd2", phone: true },
  disc("github"),
  { kind: "arch", w: 0.84, h: 1.04, fill: "#c8643b" },
  letter("d", 0.92, "#f5a3bb"),
  disc("linkedin"),
  { kind: "blossom", w: 0.94, h: 0.94, phone: true },
  { kind: "orb", w: 0.84, h: 0.84, voice: 1, phone: true },
  disc("x"),
  { kind: "wave", w: 1.3, h: 0.52, fill: "#ffbe48" },
  disc("instagram"),
  disc("mail"),
];
const PALETTES = voices.en.map(v => v.palette);

/* outlines in viewBox units (100 to S); the physics holds these exact edges */
const OUTLINE = {
  bubble: "M22 0H90Q112 0 112 22V52Q112 74 90 74H46L21 94L25 74H22Q0 74 0 52V22Q0 0 22 0Z",
  arch: "M0 42A42 42 0 0 1 84 42V96Q84 104 76 104H8Q0 104 0 96Z",
} as const;
const BARS = [12, 24, 34, 20, 30, 16, 9];

const NETS: Record<Net, { label: string; href: string; icon: ReactNode }> = {
  github: { label: "GitHub", href: "https://github.com/namu-ai-lab", icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" /></svg> },
  linkedin: { label: "LinkedIn", href: "https://www.linkedin.com/company/namu-a", icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm6.5 0h3.83v1.54h.05c.53-1 1.84-2.04 3.78-2.04 4.04 0 4.79 2.66 4.79 6.12V21h-4v-4.96c0-1.18-.02-2.7-1.65-2.7-1.65 0-1.9 1.29-1.9 2.62V21h-4V9.75Z" /></svg> },
  x: { label: "X", href: "https://x.com/namuai", icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.75 3h3.07l-6.71 7.67L22 21h-6.18l-4.84-6.33L5.44 21H2.37l7.18-8.2L2 3h6.33l4.38 5.79L17.75 3Zm-1.08 16.17h1.7L7.4 4.73H5.57l11.1 14.44Z" /></svg> },
  instagram: { label: "Instagram", href: "https://www.instagram.com/namuai.inc", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="3" width="18" height="18" rx="5.2" /><circle cx="12" cy="12" r="4.1" /><circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" stroke="none" /></svg> },
  mail: { label: "", href: "mailto:contact@namuai.org", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg> },
};

function art(s: Def): ReactNode {
  const W = s.w * 100, H = s.h * 100;
  switch (s.kind) {
    case "orb": return <canvas />;
    case "blossom":   /* the logo's open three-quarter ring, ending in the Sahel dot */
      return <svg viewBox="0 0 100 100" pointerEvents="none"><circle className="hit" cx={50} cy={50} r={50} fill="none" /><path d="M87 50A37 37 0 1 0 50 87" fill="none" stroke={INK} strokeWidth={20} strokeLinecap="round" /><circle cx={50} cy={87} r={13} fill={SAHEL} /></svg>;
    case "bubble":
      return <svg viewBox={`0 0 ${W} ${H}`} pointerEvents="none"><path className="hit" d={OUTLINE.bubble} fill={s.fill} /><text x={56} y={38} lang="ha" textAnchor="middle" dominantBaseline="central" fontSize={27} fontWeight={600} letterSpacing={-0.6} fill={INK}>sannu</text></svg>;
    case "arch":      /* a doorway in a wall of banco, the Sahel's earth building */
      return <svg viewBox={`0 0 ${W} ${H}`} pointerEvents="none"><path className="hit" d={OUTLINE.arch} fill={s.fill} /><path d="M28 104V68A14 14 0 0 1 56 68V104Z" fill={INK} /></svg>;
    case "wave":      /* a voice note: the bars dance while it is held */
      return <svg viewBox={`0 0 ${W} ${H}`} pointerEvents="none"><rect className="hit" width={W} height={H} rx={H / 2} fill={s.fill} />
        {BARS.map((b, k) => <rect key={k} className="bar" x={26 + k * 13 - 3.25} y={(H - b) / 2} width={6.5} height={b} rx={3.25} fill={INK} style={{ ["--b" as string]: k } as CSSProperties} />)}</svg>;
    case "letter": {
      const g = GLYPHS[s.glyph!];
      return <svg viewBox={`0 0 ${g.w} ${g.h}`} pointerEvents="none"><path className="hit" d={g.d} fill={s.fill} /></svg>;
    }
    case "social": return NETS[s.net!].icon;
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

export function FooterShapes({ follow, email }: { follow: string; email: string }) {
  const host = useRef<HTMLDivElement | null>(null);
  const tip = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const box = host.current; if (!box) return;
    const els: HTMLElement[] = [];
    box.querySelectorAll<HTMLElement>("[data-i]").forEach(el => { els[Number(el.dataset.i)] = el; });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hover = window.matchMedia("(hover: hover)").matches;
    let M: typeof MatterNS | null = null;
    let sim: Sim | null = null;
    let raf = 0, started = false, cancelled = false, last = 0, acc = 0, builtFor = 0, resizeT = 0;
    let swallow = false, tipFor = -1;
    const ptr = { x: -1e5, y: -1e5, px: -1e5, py: -1e5, inside: false };
    type Drag = { i: number; body: MatterNS.Body; id: number; c: MatterNS.Constraint; x0: number; y0: number; t0: number; moved: boolean; touch: boolean };
    let drag: Drag | null = null;
    const orbs = new Map<number, { gl: OrbRenderer | null; clock: number; amp: number; talk: number }>();
    let probe: SVGPathElement | null = null;

    /* points along an outline, about every 30 px, as labs.google samples its shapes */
    const sample = (d: string, scale: number) => {
      if (!probe) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("aria-hidden", "true"); svg.style.cssText = "position:absolute;width:0;height:0;visibility:hidden";
        probe = document.createElementNS("http://www.w3.org/2000/svg", "path"); svg.appendChild(probe); document.body.appendChild(svg);
      }
      probe.setAttribute("d", d);
      const len = probe.getTotalLength(), n = Math.max(10, Math.floor((len * scale) / 30)), out: MatterNS.Vector[] = [];
      for (let k = 0; k < n; k++) { const p = probe.getPointAtLength((k * len) / n); out.push({ x: p.x * scale, y: p.y * scale }); }
      return out;
    };

    type Sim = ReturnType<typeof build>;
    function build() {
      const { Engine, Bodies, Body, Composite, Events } = M!;
      const vw = window.innerWidth, W = box!.clientWidth, H = box!.clientHeight;
      builtFor = vw;
      const S = (280 * scaleFor(vw) * W) / Math.max(1, vw - 48);
      box!.style.setProperty("--S", `${S.toFixed(2)}px`);
      const live = SHAPES.map((s, i) => (vw > 1024 || s.phone ? i : -1)).filter(i => i >= 0);
      els.forEach((el, i) => { el.hidden = !live.includes(i); });
      const size = SHAPES.map(s => (s.kind === "social" ? [Math.max(46, s.w * S), Math.max(46, s.w * S)] : [s.w * S, s.h * S]));

      const body = (i: number, x: number, y: number): MatterNS.Body => {
        const s = SHAPES[i], [w, h] = size[i];
        if (s.kind === "orb" || s.kind === "blossom" || s.kind === "social") return Bodies.circle(x, y, w / 2, { ...BODY });
        if (s.kind === "wave") return Bodies.rectangle(x, y, w, h, { ...BODY, chamfer: { radius: h / 2 - 1 } });
        const [d, units] = s.kind === "letter" ? [GLYPHS[s.glyph!].outer, GLYPHS[s.glyph!].w] : [OUTLINE[s.kind as "bubble" | "arch"], s.w * 100];
        return Bodies.fromVertices(x, y, [sample(d, w / units)], { ...BODY }, true);
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
        const b = body(i, x, y);
        offset[i] = { x: (b.bounds.min.x + b.bounds.max.x) / 2 - b.position.x, y: (b.bounds.min.y + b.bounds.max.y) / 2 - b.position.y };
        Body.setAngle(b, (Math.random() - 0.5) * 0.5);
        bodies[i] = b;
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

      /* the two voices: while they touch, every second or so they hop and talk (labs.google's "popcorn") */
      const pair = live.filter(i => SHAPES[i].kind === "orb");
      const timers = new Set<number>();
      const later = (f: () => void, ms: number) => { const t = window.setTimeout(() => { timers.delete(t); f(); }, ms); timers.add(t); return t; };
      let touching = false, apart = 0, talkT = 0, talks = 0;
      const isPair = (p: MatterNS.Pair) => pair.length === 2 && [p.bodyA.parent, p.bodyB.parent].every(b => b === bodies[pair[0]] || b === bodies[pair[1]]) && p.bodyA.parent !== p.bodyB.parent;
      const arm = () => {
        if (talkT || reduce || talks >= 3) return;
        talkT = later(() => {
          talkT = 0;
          if (!touching || drag || talks >= 3) return;
          talks++;
          for (const i of pair) { const b = bodies[i]; Body.setVelocity(b, { x: b.velocity.x, y: b.velocity.y - 6.5 }); const o = orbs.get(i); if (o) o.talk = 1; }
          arm();
        }, 600 + Math.random() * 1200);
      };
      Events.on(engine, "collisionStart", e => { if (e.pairs.some(isPair)) { window.clearTimeout(apart); touching = true; arm(); } });
      Events.on(engine, "collisionEnd", e => { if (e.pairs.some(isPair)) apart = later(() => { touching = false; talks = 0; }, 120); });

      /* the orbs' paint, one small canvas each, kept between rebuilds */
      for (const i of pair) {
        let o = orbs.get(i);
        if (!o) {
          const c = els[i].querySelector("canvas"); let gl: OrbRenderer | null = null;
          if (c) { try { gl = createOrbRenderer(c); } catch { gl = null; } }
          orbs.set(i, (o = { gl, clock: Math.random() * 20, amp: 0, talk: 0 }));
        }
        o.gl?.size(size[i][0], size[i][0]);
      }

      if (reduce) for (let k = 0; k < 2400; k++) Engine.update(engine, STEP);   // shown at rest
      return {
        engine, bodies, offset, size, live, W, ceiling, H,
        resize(h: number) { Composite.remove(engine.world, fence); fence = walls(h); Composite.add(engine.world, fence); this.H = h; },
        stop() { timers.forEach(t => window.clearTimeout(t)); window.clearTimeout(apart); Events.off(engine, "collisionStart"); Events.off(engine, "collisionEnd"); Composite.clear(engine.world, false); Engine.clear(engine); },
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
        const s = SHAPES[i], b = sim!.bodies[i];
        if (s.kind === "social") continue;                       // a link should stay where the cursor finds it
        const dx = ptr.x - b.position.x, dy = ptr.y - b.position.y, c = Math.hypot(dx, dy), half = Math.max(...sim!.size[i]) / 2;
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
    function paint(dt: number, seen: boolean) {
      for (const [i, o] of orbs) {
        if (!sim!.live.includes(i)) continue;
        const b = sim!.bodies[i], s = SHAPES[i], speed = Math.hypot(b.velocity.x, b.velocity.y);
        o.talk = Math.max(0, o.talk - dt / 1400);
        const target = reduce ? 0 : Math.max(drag?.i === i ? 0.5 : 0, Math.min(0.8, speed / 10), o.talk);
        o.amp += (target - o.amp) * Math.min(1, dt / 140);
        if (!reduce) o.clock += (dt / 1000) * (0.2 + 0.7 * o.amp);
        if (seen && o.gl) { const w = sim!.size[i][0]; o.gl.draw([{ x: w / 2, y: w / 2, r: w / 2, palette: PALETTES[s.voice!], seed: s.voice! * 7.31 + 1.7, time: o.clock, amp: o.amp, rot: b.angle }]); }
      }
    }
    function placeTip() {
      const t = tip.current; if (!t) return;
      const b = tipFor >= 0 ? sim!.bodies[tipFor] : null;
      if (!b || !sim!.live.includes(tipFor)) { t.classList.remove("on"); return; }
      t.style.transform = `translate(${b.position.x.toFixed(1)}px, ${(b.position.y - sim!.size[tipFor][1] / 2 - 10).toFixed(1)}px) translate(-50%, -100%)`;
      t.classList.add("on");
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!sim) return;
      const r = box.getBoundingClientRect();
      const near = !document.hidden && r.top < window.innerHeight * 1.5 && r.bottom > -sim.ceiling;
      if (!near) { last = 0; return; }
      const dt = last ? Math.min(50, now - last) : STEP; last = now;
      if (hover && !reduce) { const seen = r.top <= window.innerHeight && r.bottom >= 0; onScroll(seen); onWindow(seen); }
      acc += dt; let k = 0;
      while (acc >= STEP && k < 9) { beforeStep(); M!.Engine.update(sim.engine, STEP); acc -= STEP; k++; }
      if (k >= 9) acc = 0;
      render(); paint(dt, r.top < window.innerHeight && r.bottom > -sim.ceiling); placeTip();
    };

    /* the pointer: a constraint from the finger or cursor to the point of the shape that was taken */
    const at = (e: PointerEvent) => { const r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const onDown = (e: PointerEvent) => {
      swallow = false;
      if (!sim || drag || e.button !== 0) return;
      const el = (e.target as Element).closest<HTMLElement>("[data-i]");
      if (!el || !box.contains(el)) return;
      const i = Number(el.dataset.i), b = sim.bodies[i]; if (!b || !sim.live.includes(i)) return;
      if (e.pointerType === "mouse") e.preventDefault();          // no text selection; a tap on a link still clicks
      const p = at(e); ptr.x = ptr.px = p.x; ptr.y = ptr.py = p.y;
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
      if (drag.moved) { swallow = true; window.setTimeout(() => { swallow = false; }, 0); }
      else if (drag.touch && SHAPES[drag.i].kind !== "social" && performance.now() - drag.t0 < 450) hop(drag.body, 1);
      drag = null;
    };
    const onClick = (e: MouseEvent) => { if (swallow) { e.preventDefault(); e.stopPropagation(); swallow = false; } };
    const onEnter = (e: PointerEvent) => { if (e.pointerType === "mouse") ptr.inside = true; };
    const onLeave = (e: PointerEvent) => { if (e.pointerType === "mouse") { ptr.inside = false; tipFor = -1; wasIn.length = 0; wasNear.length = 0; } };
    /* a disc's name, over it, while the cursor or the keyboard is on it */
    const setTip = (e: Event) => {
      const el = (e.target as Element).closest?.<HTMLElement>(".is-social");
      tipFor = el ? Number(el.dataset.i) : -1;
      if (el && tip.current) tip.current.textContent = `${el.getAttribute("aria-label")}${el.getAttribute("target") ? " \u2197" : ""}`;
    };
    const onOver = (e: PointerEvent) => { if (e.pointerType === "mouse") setTip(e); };
    const onFocus = (e: FocusEvent) => { if (!started) void start(); setTip(e); };
    const onBlur = () => { tipFor = -1; };

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
    box.addEventListener("pointerover", onOver);
    box.addEventListener("click", onClick, true);
    box.addEventListener("focusin", onFocus); box.addEventListener("focusout", onBlur);
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
      box.removeEventListener("pointerover", onOver);
      box.removeEventListener("click", onClick, true);
      box.removeEventListener("focusin", onFocus); box.removeEventListener("focusout", onBlur);
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("scroll", check); window.removeEventListener("resize", onResize);
      sim?.stop(); sim = null;
      orbs.forEach(o => o.gl?.destroy());
      probe?.parentElement?.remove();
    };
  }, []);

  const shape = (s: Def, i: number) => {
    const style = { ["--w" as string]: s.w, ["--h" as string]: s.h } as CSSProperties;
    if (s.kind === "social") {
      const n = NETS[s.net!], external = s.net !== "mail";
      return <a key={i} className="ftr-shape is-social" data-i={i} href={n.href} aria-label={n.label || email} style={style}
        {...(external ? { target: "_blank", rel: "noopener" } : {})}><span className="ftr-in">{art(s)}</span></a>;
    }
    const tint = s.kind === "orb" ? { background: `radial-gradient(circle at 35% 30%, ${PALETTES[s.voice!][1]}, ${PALETTES[s.voice!][0]} 55%, ${PALETTES[s.voice!][2]})` } : undefined;
    return <div key={i} className={`ftr-shape is-${s.kind}`} data-i={i} aria-hidden="true" style={style}><div className="ftr-in" style={tint}>{art(s)}</div></div>;
  };

  return (
    <div className="ftr-pile" ref={host}>
      {SHAPES.map((s, i) => (s.kind === "social" ? null : shape(s, i)))}
      <nav className="ftr-follow" aria-label={follow}>{SHAPES.map((s, i) => (s.kind === "social" ? shape(s, i) : null))}</nav>
      <span className="ftr-tip" ref={tip} aria-hidden="true" />
      {/* without JavaScript the links still sit on the line */}
      <noscript dangerouslySetInnerHTML={{ __html: "<style>.ftr-pile{display:flex;align-items:flex-end;justify-content:center;gap:12px;aspect-ratio:auto;padding-top:40px}.ftr-pile>.ftr-shape{display:none}.ftr-shape.social{position:relative;opacity:1}</style>" }} />
    </div>
  );
}
