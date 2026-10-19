import type { ReactNode } from "react";
import { synthesise } from "@/lib/field";

/* The Lab's imagery, drawn as static SVG on the server (no client JS, no stock photos).
   Three families, after deepmind.google's card art:
   - Glass: soft, out-of-focus glass objects on a warm haze (DeepMind's audio and model cards).
   - Blueprint: a thin-line construction drawing with a few filled blocks (the DeepMind Institute card).
   - Night: glowing ridgelines of a voice on the Ink ground (the AlphaGenome card).
   Palettes stay warm (Sahel, sand, clay, dusk rose); the founder ruled out green. */

type Ratio = "card" | "square" | "wide" | "tall";
const SIZE: Record<Ratio, [number, number]> = { card: [400, 600], square: [600, 600], wide: [900, 600], tall: [600, 760] };

export type Palette = "apricot" | "sand" | "dusk" | "ember" | "night" | "haze";
const PAL: Record<Palette, { bg0: string; bg1: string; bg2: string; hi: string; mid: string; deep: string; shadow: string; dots: string }> = {
  apricot: { bg0: "#fff6ee", bg1: "#ffd8b8", bg2: "#f7b184", hi: "#ffffff", mid: "#f9c39c", deep: "#ea9461", shadow: "#e07a3f", dots: "#ffffff" },
  sand:    { bg0: "#fbf6ef", bg1: "#f4e2c9", bg2: "#e8c79d", hi: "#ffffff", mid: "#efd6b4", deep: "#cf9b62", shadow: "#b98149", dots: "#ffffff" },
  dusk:    { bg0: "#fcf2ef", bg1: "#f7d0c6", bg2: "#e3b3c9", hi: "#ffffff", mid: "#f4c2b6", deep: "#d48ea6", shadow: "#bd7193", dots: "#ffffff" },
  ember:   { bg0: "#a8441c", bg1: "#d9692f", bg2: "#f29a5f", hi: "#ffffff", mid: "#ffd9bd", deep: "#f6ad7b", shadow: "#5b200b", dots: "#ffe2cc" },
  night:   { bg0: "#140e0b", bg1: "#3b2318", bg2: "#7a4325", hi: "#fff3e8", mid: "#f6b48a", deep: "#e8935a", shadow: "#000000", dots: "#f6b48a" },
  haze:    { bg0: "#fff6ec", bg1: "#ffe2c8", bg2: "#fbc9a3", hi: "#ffffff", mid: "#ffe9d8", deep: "#f6b48a", shadow: "#f0a06b", dots: "#ffffff" },
};

function hash(s: string) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); }
function rng(seed: number) { let s = seed || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

type Shape = { kind: "fill" | "stroke"; w?: number; render: (paint: string, extra?: Record<string, unknown>) => ReactNode };
const fillPath = (d: string): Shape => ({ kind: "fill", render: (p, e) => <path d={d} fill={p} {...e} /> });
const strokePath = (d: string, w: number): Shape => ({ kind: "stroke", w, render: (p, e) => <path d={d} fill="none" stroke={p} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" {...e} /> });
const rrect = (x: number, y: number, w: number, h: number, r: number): Shape =>
  ({ kind: "fill", render: (p, e) => <rect x={x} y={y} width={w} height={h} rx={r} fill={p} {...e} /> });
const circle = (cx: number, cy: number, r: number): Shape => ({ kind: "fill", render: (p, e) => <circle cx={cx} cy={cy} r={r} fill={p} {...e} /> });
const glyph = (ch: string, x: number, y: number, size: number): Shape =>
  ({ kind: "fill", render: (p, e) => <text x={x} y={y} fontSize={size} fontFamily="var(--sans)" fontWeight={500} textAnchor="middle" fill={p} {...e}>{ch}</text> });

/** One glass object: a soft cast shadow, a blurred gradient body, a bright inner rim and a specular glint. */
function Glass({ id, s, pal, blur = 4, depth = 1 }: { id: string; s: Shape; pal: typeof PAL.apricot; blur?: number; depth?: number }) {
  const rim = s.kind === "fill"
    ? s.render("none", { stroke: pal.hi, strokeWidth: 22, filter: `url(#${id}-rb)`, opacity: .95 })
    : s.render(pal.hi, { strokeWidth: (s.w || 20) * .34, transform: `translate(${-(s.w || 20) * .12} ${-(s.w || 20) * .14})`, filter: `url(#${id}-rb)`, opacity: .95 });
  return (
    <g>
      <mask id={`${id}-m`} maskUnits="userSpaceOnUse">{s.render("#fff")}</mask>
      <g transform={`translate(${18 * depth} ${30 * depth})`} filter={`url(#${id}-sh)`} opacity={.42}>{s.render(pal.shadow)}</g>
      <g filter={blur ? `url(#${id}-b${blur})` : undefined}>
        {s.render(`url(#${id}-body)`)}
        <g mask={`url(#${id}-m)`}>{rim}</g>
      </g>
    </g>
  );
}

function Backdrop({ id, W, H, pal, seed }: { id: string; W: number; H: number; pal: typeof PAL.apricot; seed: number }) {
  const r = rng(seed);
  const blobs = [0, 1, 2].map(i => ({ cx: W * (.15 + r() * .7), cy: H * (.2 + r() * .7), rx: W * (.35 + r() * .25), ry: H * (.25 + r() * .2), c: i === 1 ? pal.bg2 : pal.bg1 }));
  return (
    <>
      <rect width={W} height={H} fill={pal.bg0} />
      <g filter={`url(#${id}-bg)`}>{blobs.map((b, i) => <ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={b.c} opacity={i === 2 ? .8 : 1} />)}</g>
      <rect width={W} height={H} fill={`url(#${id}-dots)`} mask={`url(#${id}-dm)`} />
    </>
  );
}

function Defs({ id, W, H, pal, angle = 35 }: { id: string; W: number; H: number; pal: typeof PAL.apricot; angle?: number }) {
  const a = (angle * Math.PI) / 180;
  return (
    <defs>
      <linearGradient id={`${id}-body`} x1={.5 - Math.cos(a) / 2} y1={.5 - Math.sin(a) / 2} x2={.5 + Math.cos(a) / 2} y2={.5 + Math.sin(a) / 2}>
        <stop offset="0" stopColor={pal.hi} stopOpacity=".98" />
        <stop offset=".45" stopColor={pal.mid} stopOpacity=".92" />
        <stop offset="1" stopColor={pal.deep} stopOpacity=".95" />
      </linearGradient>
      <filter id={`${id}-bg`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={Math.min(W, H) * .12} /></filter>
      <filter id={`${id}-sh`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22" /></filter>
      <filter id={`${id}-rb`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" /></filter>
      {[2, 4, 7, 12].map(b => <filter key={b} id={`${id}-b${b}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={b} /></filter>)}
      <pattern id={`${id}-dots`} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r=".9" fill={pal.dots} /></pattern>
      <radialGradient id={`${id}-dg`} cx=".62" cy=".42" r=".5"><stop offset="0" stopColor="#fff" stopOpacity=".55" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      <mask id={`${id}-dm`} maskUnits="userSpaceOnUse"><rect width={W} height={H} fill={`url(#${id}-dg)`} /></mask>
    </defs>
  );
}

/* ---- motifs: compositions of glass objects, laid out on a 600-unit square around (cx, cy) ---- */
type Motif = "talk" | "blossom" | "mic" | "bars" | "sieve" | "stack" | "glyph";
function motifShapes(m: Motif, cx: number, cy: number, k: number, ch = "ƙ"): { s: Shape; blur?: number; depth?: number }[] {
  const X = (v: number) => cx + v * k, Y = (v: number) => cy + v * k, L = (v: number) => v * k;
  switch (m) {
    case "talk": return [
      { s: fillPath(`M${X(-190)} ${Y(-150)}h${L(230)}a${L(56)} ${L(56)} 0 0 1 ${L(56)} ${L(56)}v${L(92)}a${L(56)} ${L(56)} 0 0 1 ${L(-56)} ${L(56)}h${L(-150)}l${L(-60)} ${L(52)}l${L(8)} ${L(-52)}h${L(-28)}a${L(56)} ${L(56)} 0 0 1 ${L(-56)} ${L(-56)}v${L(-92)}a${L(56)} ${L(56)} 0 0 1 ${L(56)} ${L(-56)}z`), blur: 7, depth: .8 },
      ...[-40, 0, 40, 80, 120].map((x, i) => ({ s: rrect(X(x - 11), Y(-20 - [40, 90, 60, 110, 50][i] / 2), L(22), L([40, 90, 60, 110, 50][i]), L(11)), blur: 2, depth: .5 })),
      { s: fillPath(`M${X(-20)} ${Y(40)}h${L(170)}a${L(50)} ${L(50)} 0 0 1 ${L(50)} ${L(50)}v${L(80)}a${L(50)} ${L(50)} 0 0 1 ${L(-50)} ${L(50)}h${L(-10)}l${L(10)} ${L(46)}l${L(-58)} ${L(-46)}h${L(-112)}a${L(50)} ${L(50)} 0 0 1 ${L(-50)} ${L(-50)}v${L(-80)}a${L(50)} ${L(50)} 0 0 1 ${L(50)} ${L(-50)}z`), blur: 4, depth: 1 },
    ];
    case "blossom": return [
      { s: strokePath(`M${X(150)} ${Y(0)}A${L(150)} ${L(150)} 0 1 0 ${X(0)} ${Y(150)}`, L(56)), blur: 4 },
      { s: circle(X(0), Y(150), L(44)), blur: 2, depth: 1.2 },
    ];
    case "mic": return [
      { s: rrect(X(-62), Y(-210), L(124), L(230), L(62)), blur: 4 },
      { s: strokePath(`M${X(-118)} ${Y(-40)}v${L(10)}a${L(118)} ${L(118)} 0 0 0 ${L(236)} 0v${L(-10)}M${X(0)} ${Y(90)}v${L(80)}`, L(30)), blur: 7, depth: .7 },
      { s: strokePath(`M${X(170)} ${Y(-130)}a${L(150)} ${L(150)} 0 0 1 0 ${L(170)}`, L(22)), blur: 12, depth: .5 },
    ];
    case "bars": return [-200, -130, -60, 10, 80, 150, 220].map((x, i) => {
      const h = [120, 240, 170, 330, 210, 280, 140][i];
      return { s: rrect(X(x - 24), Y(-h / 2), L(48), L(h), L(24)), blur: [7, 4, 2, 2, 2, 4, 7][i], depth: .9 };
    });
    case "sieve": return [
      { s: strokePath(`M${X(-200)} ${Y(-90)}a${L(200)} ${L(70)} 0 1 0 ${L(400)} 0a${L(200)} ${L(70)} 0 1 0 ${L(-400)} 0`, L(40)), blur: 4 },
      ...[[-60, 60, 30], [40, 110, 22], [-10, 190, 26], [90, 230, 16], [-110, 170, 18]].map(([x, y, r]) => ({ s: circle(X(x), Y(y), L(r)), blur: y > 180 ? 7 : 2, depth: .6 })),
    ];
    case "stack": return [80, 0, -80].map((y, i) => ({ s: fillPath(`M${X(-210)} ${Y(y)}l${L(210)} ${L(-100)}l${L(210)} ${L(100)}l${L(-210)} ${L(100)}z`), blur: [7, 4, 2][i], depth: .9 }));
    case "glyph": return [{ s: glyph(ch, X(0), Y(150), L(470)), blur: 7 }];
  }
}

export function GlassArt({ motif, palette = "apricot", ratio = "card", seed, ch, label, place = "low" }:
  { motif: Motif; palette?: Palette; ratio?: Ratio; seed?: string; ch?: string; label?: string; place?: "low" | "centre" }) {
  const [W, H] = SIZE[ratio];
  const pal = PAL[palette];
  const id = `g${hash(`${motif}${palette}${ratio}${seed ?? ""}${ch ?? ""}`).toString(36)}`;
  const k = Math.min(W, H) / 600 * (ratio === "card" ? 1 : .92);
  const cx = W * (ratio === "card" ? .56 : .52), cy = place === "low" && ratio === "card" ? H * .6 : H * .52;
  const shapes = motifShapes(motif, cx, cy, k, ch);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <Defs id={id} W={W} H={H} pal={pal} />
      <Backdrop id={id} W={W} H={H} pal={pal} seed={hash(id)} />
      {shapes.map((g, i) => <Glass key={i} id={`${id}-${i}`} s={g.s} pal={pal} blur={g.blur} depth={g.depth} />)}
      {shapes.map((_, i) => <Defs key={`d${i}`} id={`${id}-${i}`} W={W} H={H} pal={pal} angle={35 + i * 8} />)}
    </svg>
  );
}

/* ---- Blueprint: a construction drawing of a system, a few blocks filled in apricot ---- */
export function Blueprint({ kind = "hira", ratio = "card", label }: { kind?: "hira" | "pipeline" | "measure"; ratio?: Ratio; label?: string }) {
  const [W, H] = SIZE[ratio];
  const cx = W / 2, cy = ratio === "card" ? H * .6 : H / 2, R = Math.min(W, H) * .36;
  const line = { stroke: "#8f857c", strokeWidth: .8, fill: "none" } as const;
  const dash = { ...line, strokeDasharray: "4 5" } as const;
  const box = (x: number, y: number, w: number, h: number, on = false) => (
    <g>
      {on && <rect x={x} y={y} width={w} height={h} fill="#fbd6b9" />}
      <rect x={x} y={y} width={w} height={h} {...line} stroke={on ? "#e8935a" : "#8f857c"} strokeWidth={on ? 1.4 : .8} />
      {on && <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} fill="none" stroke="#e8935a" strokeWidth=".6" opacity=".7" />}
    </g>
  );
  const node = (x: number, y: number) => <g><circle cx={x} cy={y} r="7" {...line} fill="#fff" /><circle cx={x} cy={y} r="2.4" fill="#4a453f" /></g>;
  const ticks = Array.from({ length: 9 }, (_, i) => -R + (i * 2 * R) / 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <rect width={W} height={H} fill="#f8f6f3" />
      <line x1={cx} y1={cy - R * 1.25} x2={cx} y2={cy + R * 1.25} {...dash} />
      <line x1={0} y1={cy} x2={W} y2={cy} {...dash} />
      {ticks.map((t, i) => <g key={i}><line x1={cx - 4} y1={cy + t} x2={cx + 4} y2={cy + t} {...line} /><line x1={cx + t} y1={cy - 4} x2={cx + t} y2={cy + 4} {...line} /></g>)}
      {kind === "hira" && <>
        <ellipse cx={cx} cy={cy} rx={R * 1.05} ry={R * .78} {...line} />
        <path d={`M${cx - R * 1.3} ${cy}A${R * 1.3} ${R * 1.3} 0 0 0 ${cx + R * 1.3} ${cy}`} {...dash} />
        <circle cx={cx} cy={cy} r={R * .22} {...line} />
        <circle cx={cx} cy={cy} r="5" fill="#4a453f" />
        <path d={`M${cx} ${cy}C${cx - R * .5} ${cy - R * .05} ${cx - R * .9} ${cy - R * .2} ${cx - R * 1.25} ${cy - R * .1}`} {...line} />
        <path d={`M${cx} ${cy}C${cx + R * .5} ${cy - R * .1} ${cx + R * .7} ${cy - R * .6} ${cx + R * .8} ${cy - R * .78}`} {...line} />
        <path d={`M${cx} ${cy}C${cx - R * .3} ${cy + R * .4} ${cx - R * .55} ${cy + R * .55} ${cx - R * .6} ${cy + R * .8}`} {...line} />
        <path d={`M${cx} ${cy}C${cx + R * .4} ${cy + R * .3} ${cx + R * .6} ${cy + R * .45} ${cx + R * .7} ${cy + R * .5}`} {...line} />
        {box(cx + R * .55, cy - R * 1.05, R * .55, R * .32, true)}
        {box(cx - R * 1.35, cy - R * .62, R * .42, R * .28)}
        {box(cx - R * 1.55, cy + R * .1, R * .32, R * .32)}
        {box(cx - R * 1.55, cy + R * .1, R * .16, R * .32, true)}
        {box(cx + R * .62, cy + R * .3, R * .38, R * .5, true)}
        {box(cx + R * .05, cy + R * .25, R * .16, R * .12)}
        {box(cx + R * .05, cy + R * .37, R * .16, R * .12, true)}
        {box(cx + R * .05, cy + R * .49, R * .16, R * .12)}
        {box(cx - R * .62, cy - R * .62, R * .2, R * .2, true)}
        {node(cx - R * .6, cy + R * .8)}{node(cx - R * 1.25, cy - R * .1)}
      </>}
      {kind === "pipeline" && <>
        {[-1.2, -.4, .4, 1.2].map((t, i) => <g key={i}>{box(cx + t * R - R * .28, cy - R * .2, R * .56, R * .4, i === 1 || i === 3)}</g>)}
        {[-.8, 0, .8].map((t, i) => <line key={i} x1={cx + (t - .12) * R} y1={cy} x2={cx + (t + .12) * R} y2={cy} stroke="#4a453f" strokeWidth="1" />)}
        <path d={`M${cx - R * 1.2} ${cy + R * .2}C${cx - R * 1.2} ${cy + R * .9} ${cx + R * 1.2} ${cy + R * .9} ${cx + R * 1.2} ${cy + R * .2}`} {...dash} />
        <circle cx={cx} cy={cy - R * .7} r={R * .3} {...line} />{node(cx, cy - R * .7)}
        {node(cx - R * 1.2, cy + R * .2)}{node(cx + R * 1.2, cy + R * .2)}
      </>}
      {kind === "measure" && <>
        <circle cx={cx} cy={cy} r={R} {...line} /><circle cx={cx} cy={cy} r={R * .66} {...dash} /><circle cx={cx} cy={cy} r={R * .33} {...line} />
        {Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return <line key={i} x1={cx + Math.cos(a) * R * .94} y1={cy + Math.sin(a) * R * .94} x2={cx + Math.cos(a) * R} y2={cy + Math.sin(a) * R} {...line} />; })}
        {box(cx + R * .3, cy - R * .9, R * .5, R * .3, true)}{box(cx - R * 1.2, cy + R * .4, R * .45, R * .45, true)}{box(cx - R * .9, cy - R * .8, R * .25, R * .25)}
        <path d={`M${cx} ${cy}L${cx + R * .7} ${cy - R * .55}`} stroke="#4a453f" strokeWidth="1.2" />{node(cx, cy)}
      </>}
    </svg>
  );
}

/* ---- Night: a voice's spectral ridgelines glowing on the Ink ground ---- */
export function NightArt({ seed = "night", ratio = "card", label, tone = "warm" }: { seed?: string; ratio?: Ratio; label?: string; tone?: "warm" | "rose" }) {
  const [W, H] = SIZE[ratio];
  const id = `n${hash(seed + ratio).toString(36)}`;
  const rows = 22, cols = 120;
  const data = synthesise({ seconds: 20, bands: rows, seed: hash(seed) % 100000 });
  const start = hash(seed + "s") % 300;
  const top = H * (ratio === "card" ? .42 : .3), bottom = H * .92;
  const rowY = (k: number) => top + (bottom - top) * Math.pow(k / (rows - 1), 1.25);
  const lines: { d: string; o: number }[] = [];
  for (let k = 0; k < rows; k++) {
    const band = rows - 1 - k, depth = k / (rows - 1), y0 = rowY(k), sp = k ? y0 - rowY(k - 1) : rowY(1) - rowY(0);
    const amp = sp * (2.4 + 7 * depth) * .62, pts: string[] = [];
    for (let c = 0; c < cols; c++) {
      const x = (c / (cols - 1)) * W, edge = Math.max(0, Math.min(1, x / (W * .14), (W - x) / (W * .14)));
      pts.push(`${x.toFixed(1)} ${(y0 - (data.E[(start + c) % data.frames][band] as number) * edge * amp).toFixed(1)}`);
    }
    lines.push({ d: "M" + pts.join("L"), o: .12 + .88 * Math.pow(depth, 1.4) });
  }
  const r = rng(hash(seed));
  const dust = Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * H * .75, rad: .4 + r() * 1.2, o: .2 + r() * .6 }));
  const [c1, c2, c3] = tone === "rose" ? ["#f6c1b6", "#f39aa0", "#e8935a"] : ["#ffe2c9", "#f6b48a", "#e8935a"];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <radialGradient id={`${id}-g`} cx=".5" cy=".75" r=".8"><stop offset="0" stopColor="#3a2219" /><stop offset=".55" stopColor="#1f1511" /><stop offset="1" stopColor="#120c0a" /></radialGradient>
        <linearGradient id={`${id}-l`} x1="0" x2="1"><stop offset="0" stopColor={c1} /><stop offset=".55" stopColor={c2} /><stop offset="1" stopColor={c3} /></linearGradient>
        <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-g)`} />
      {dust.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.rad} fill="#ffd9bd" opacity={d.o} />)}
      <g filter={`url(#${id}-glow)`}>
        {lines.map((l, i) => <path key={i} d={l.d} fill="none" stroke={`url(#${id}-l)`} strokeOpacity={l.o} strokeWidth={.9 + 1.1 * (i / rows)} strokeLinejoin="round" />)}
      </g>
    </svg>
  );
}

/* ---- the hero's glass Blossom: the Namu ring, very soft, floating in the haze ---- */
export function HeroRing({ id = "hr" }: { id?: string } = {}) {
  return (
    <svg className="ring" viewBox="0 0 600 600" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".6" stopColor="#ffe7d4" stopOpacity=".8" /><stop offset="1" stopColor="#f7b48a" stopOpacity=".7" /></linearGradient>
        <filter id={`${id}-s`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16" /></filter>
        <filter id={`${id}-h`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
      </defs>
      <g filter={`url(#${id}-s)`} opacity=".55" transform="translate(16 26)"><path d="M480 300A180 180 0 1 0 300 480" fill="none" stroke="#f2a06b" strokeWidth="70" strokeLinecap="round" /></g>
      <g filter={`url(#${id}-h)`}>
        <path d="M480 300A180 180 0 1 0 300 480" fill="none" stroke={`url(#${id}-b)`} strokeWidth="64" strokeLinecap="round" />
        <path d="M472 290A172 172 0 1 0 290 472" fill="none" stroke="#fff" strokeWidth="16" strokeLinecap="round" opacity=".9" />
        <circle cx="300" cy="480" r="50" fill={`url(#${id}-b)`} />
      </g>
    </svg>
  );
}
