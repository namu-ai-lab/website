/* Night pieces for the /api page's model cards (after openai.com/api's starfields, made of the Sahel and of each
   model). Drawn as SVG on the server from a fixed seed, so every visit sees the same picture and no image is loaded:
     Tafiya     a voice travelling: the Milky Way over the dunes, and a waveform of light walking the near crest
     Tatsuniya  stories by the fire: sparks rise from a fire and become stars; three constellations are Hausa's
                hooked letters ƙ, ɗ and ɓ (the letters Tatsuniya writes)
     Kora       two languages, one instrument: strings of light fanned from a bridge under the moon, warm on one side
                and moon-pale on the other
   Warm night only (ink, kola, apricot, ember; the moon's pale light on Kora); no green. A few stars twinkle, the
   sparks rise and the strings shimmer, all stilled under reduced motion (api.css). */
import type { ReactNode } from "react";

const W = 400, H = 520;

/* a small seeded generator (mulberry32), so the sky is the same on every render */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const f = (n: number) => Math.round(n * 10) / 10;

/* a field of stars between y0 and y1: many faint, a few bright with a halo, the brightest with a soft cross */
function Stars({ id, seed, n, y0, y1, warm = 0.75 }: { id: string; seed: number; n: number; y0: number; y1: number; warm?: number }) {
  const r = rng(seed), out: ReactNode[] = [], bright: ReactNode[] = [];
  const tint = () => { const c = r(); return c < warm ? (c < warm * .45 ? "#ffe9d6" : "#fff8f0") : c < warm + (1 - warm) * .6 ? "#ffd2ad" : "#dfe6f6"; };
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = y0 + Math.pow(r(), 1.35) * (y1 - y0), big = r() > .965;
    const s = big ? 0.9 + r() * 1.1 : 0.25 + r() * 0.55, o = big ? .95 : .25 + r() * .6;
    const tw = r() < .12 ? { className: "mart-tw", style: { animationDelay: `${f(r() * 6)}s`, animationDuration: `${f(3 + r() * 4)}s` } } : {};
    out.push(<circle key={i} cx={f(x)} cy={f(y)} r={f(s)} fill={tint()} opacity={f(o)} {...tw} />);
    if (big) bright.push(<circle key={`h${i}`} cx={f(x)} cy={f(y)} r={f(s * 5)} fill={`url(#${id}-halo)`} />);
  }
  /* two or three with a soft four-point flare, as a camera sees the brightest stars */
  for (let i = 0; i < 3; i++) {
    const x = 40 + r() * 320, y = y0 + 20 + r() * (y1 - y0) * .55, l = 9 + r() * 9;
    bright.push(<g key={`f${i}`} opacity=".85"><circle cx={f(x)} cy={f(y)} r="1.6" fill="#fff8f0" /><circle cx={f(x)} cy={f(y)} r="9" fill={`url(#${id}-halo)`} />
      <path d={`M${f(x - l)} ${f(y)}H${f(x + l)}M${f(x)} ${f(y - l)}V${f(y + l)}`} stroke={`url(#${id}-flare)`} strokeWidth=".6" /></g>);
  }
  return <g>{bright}{out}</g>;
}

/* shared defs: a star halo, a flare, a nebula filter, the grain */
function Defs({ id, nebula, seed }: { id: string; nebula: [number, number, number]; seed: number }) {
  const [R, G, B] = nebula;
  return (
    <defs>
      <radialGradient id={`${id}-halo`}><stop offset="0" stopColor="#fff2e4" stopOpacity=".55" /><stop offset="1" stopColor="#fff2e4" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}-flare`} x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".9" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      <filter id={`${id}-neb`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.0065 0.016" numOctaves="5" seed={seed} result="n" />
        <feColorMatrix in="n" type="matrix" values={`0 0 0 0 ${R}  0 0 0 0 ${G}  0 0 0 0 ${B}  1.55 0 0 0 -.6`} />
        <feGaussianBlur stdDeviation=".6" />
      </filter>
      <filter id={`${id}-dust`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="4" seed={seed + 3} result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 .03  0 0 0 0 .02  0 0 0 0 .02  2.2 0 0 0 -1.05" />
      </filter>
      <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4" /></filter>
      <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
      <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed={seed + 7} stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 .95  0 0 0 0 .9  0 0 0 .07 0" />
      </filter>
    </defs>
  );
}

/* a band of the Milky Way along the line from (x0,y0) to (x1,y1), `w` wide */
function Band({ id, x0, y0, x1, y1, w, o = 1, glow = "#d98a55" }: { id: string; x0: number; y0: number; x1: number; y1: number; w: number; o?: number; glow?: string }) {
  const a = (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI, len = Math.hypot(x1 - x0, y1 - y0);
  return (
    <g opacity={o}>
      <mask id={`${id}-bandm`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
        <rect width={W} height={H} fill="#000" />
        <g transform={`translate(${x0} ${y0}) rotate(${f(a)})`}>
          <rect x={-40} y={-w / 2} width={len + 80} height={w} fill={`url(#${id}-bandg)`} filter={`url(#${id}-soft)`} />
        </g>
      </mask>
      <linearGradient id={`${id}-bandg`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      <g mask={`url(#${id}-bandm)`}>
        <rect width={W} height={H} fill={glow} opacity=".2" />
        <rect width={W} height={H} filter={`url(#${id}-neb)`} />
        <rect width={W} height={H} filter={`url(#${id}-dust)`} opacity=".9" />
      </g>
    </g>
  );
}
const Grain = ({ id }: { id: string }) => <rect width={W} height={H} filter={`url(#${id}-grain)`} />;

/* ---------------------------------------------------------------- Tafiya: a voice travelling over the dunes */
function Tafiya() {
  const id = "m-taf", r = rng(41);
  const crest = (x: number) => 336 - 22 * Math.sin((x + 30) / 120) - 9 * Math.sin(x / 47 + 1.2);
  const near = `M0 ${f(crest(0))} ${Array.from({ length: 41 }, (_, i) => `L${i * 10} ${f(crest(i * 10))}`).join(" ")} L${W} ${H} L0 ${H}Z`;
  const mid = "M0 304 C70 288 120 296 170 302 S280 282 330 290 S390 298 400 294 L400 520 L0 520Z";
  const far = "M0 288 C60 278 110 283 160 281 S250 271 300 276 S370 279 400 273 L400 520 L0 520Z";
  /* the voice: a speech-like envelope along the crest, its bars rising from the sand */
  const bars: ReactNode[] = [];
  for (let i = 0; i < 58; i++) {
    const x = 26 + i * 6.2, y = crest(x) - 1.5;
    const env = Math.pow(Math.sin((i / 57) * Math.PI), .7) * (.35 + .65 * Math.abs(Math.sin(i * .9) * Math.cos(i * .37 + .6)));
    const h = 4 + env * 30 + r() * 4;
    bars.push(<line key={i} className="mart-bar" style={{ animationDelay: `${f(i * .045)}s` }} x1={f(x)} x2={f(x)} y1={f(y)} y2={f(y - h)} stroke="#ffd2ad" strokeWidth="1.6" strokeLinecap="round" opacity={f(.35 + env * .6)} />);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Defs id={id} nebula={[.98, .78, .62]} seed={11} />
      <linearGradient id={`${id}-sky`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#07050a" /><stop offset=".3" stopColor="#120c0b" /><stop offset=".47" stopColor="#2e170d" /><stop offset=".55" stopColor="#8a4520" /><stop offset=".6" stopColor="#1a0f0a" />
      </linearGradient>
      <radialGradient id={`${id}-dusk`} cx=".2" cy=".55" r=".55"><stop offset="0" stopColor="#e8935a" stopOpacity=".55" /><stop offset="1" stopColor="#e8935a" stopOpacity="0" /></radialGradient>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      <Band id={id} x0={-20} x1={430} y0={30} y1={250} w={150} glow="#e0925c" />
      <rect width={W} height={H} fill={`url(#${id}-dusk)`} />
      <Stars id={id} seed={7} n={520} y0={0} y1={290} />
      <path d={far} fill="#1d110b" />
      <path d={far} fill="none" stroke="#f6b48a" strokeWidth=".8" opacity=".35" />
      <path d={mid} fill="#130c09" />
      <path d={mid} fill="none" stroke="#f6b48a" strokeWidth=".9" opacity=".3" />
      <path d={near} fill="#0b0706" />
      <g filter={`url(#${id}-glow)`} opacity=".9">{bars}</g>
      <g>{bars}</g>
      <path d={near.split(" L400 520")[0]} fill="none" stroke="#ffb987" strokeWidth="1" opacity=".55" />
      <Grain id={id} />
    </svg>
  );
}

/* ---------------------------------------------------------------- Tatsuniya: stories by the fire */
/* letter skeletons in a 0–60 box, as constellations: each a list of strokes, each stroke a list of stars */
const LETTERS: Record<string, [number, number][][]> = {
  "ƙ": [[[0, 60], [0, 30], [0, 8], [6, 0], [16, 2]], [[0, 40], [24, 20]], [[9, 32], [26, 60]]],
  "ɗ": [[[34, 32], [24, 26], [10, 30], [4, 44], [12, 58], [26, 58], [34, 48]], [[34, 60], [34, 34], [34, 10], [40, 0], [50, 3]]],
  "ɓ": [[[0, 10], [6, 0], [16, 2]], [[0, 10], [0, 34], [0, 60]], [[0, 40], [10, 30], [24, 30], [32, 44], [24, 58], [10, 58], [0, 52]]],
};
function Constellation({ ch, x, y, s, tw }: { ch: string; x: number; y: number; s: number; tw: number }) {
  const pts = LETTERS[ch].map(st => st.map(([px, py]) => [x + px * s, y + py * s] as const));
  return (
    <g>
      {pts.map((st, i) => <polyline key={i} points={st.map(p => `${f(p[0])},${f(p[1])}`).join(" ")} fill="none" stroke="#ffd9bb" strokeWidth=".5" opacity=".38" />)}
      {pts.flat().map(([px, py], i) => <circle key={`s${i}`} className={i % 3 === 0 ? "mart-tw" : undefined} style={i % 3 === 0 ? { animationDelay: `${f(tw + i * .7)}s` } : undefined}
        cx={f(px)} cy={f(py)} r={i % 4 === 0 ? 1.5 : 1.05} fill="#fff4e8" />)}
    </g>
  );
}
function Tatsuniya() {
  const id = "m-tat", r = rng(77);
  /* sparks: born at the fire, rising in a widening plume, smaller and cooler as they climb, until they read as stars */
  const sparks: ReactNode[] = [];
  for (let i = 0; i < 90; i++) {
    const t = Math.pow(r(), .8), y = 330 - t * 250, spread = 10 + t * 115;
    const x = 200 + (r() - .5) * 2 * spread * (.4 + r() * .6) + Math.sin(t * 7 + i) * 8;
    const s = 1.6 - t * 1.2 + r() * .4, c = t < .35 ? "#ffd27f" : t < .7 ? "#ffb987" : "#ffe6cf";
    sparks.push(<g key={i} className="mart-spark" style={{ animationDelay: `${f(r() * 5)}s`, animationDuration: `${f(4 + r() * 4)}s` }}>
      {t < .55 && <line x1={f(x)} x2={f(x + (r() - .5) * 3)} y1={f(y + s)} y2={f(y + s + 4 + (1 - t) * 9)} stroke={`url(#${id}-trail)`} strokeWidth={f(Math.max(.5, s * .8))} strokeLinecap="round" />}
      {t < .3 && <circle cx={f(x)} cy={f(y)} r={f(s * 2.4)} fill="#ffb25e" opacity=".1" />}
      <circle cx={f(x)} cy={f(y)} r={f(Math.max(.35, s * .85))} fill={c} opacity={f(.55 + (1 - t) * .45)} />
    </g>);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Defs id={id} nebula={[.95, .72, .55]} seed={23} />
      <linearGradient id={`${id}-sky`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#060408" /><stop offset=".4" stopColor="#110a09" /><stop offset=".62" stopColor="#2a140b" /><stop offset=".7" stopColor="#120a07" /><stop offset="1" stopColor="#080504" />
      </linearGradient>
      <radialGradient id={`${id}-fire`} cx=".5" cy=".66" r=".5"><stop offset="0" stopColor="#ffb25e" stopOpacity=".9" /><stop offset=".25" stopColor="#e8935a" stopOpacity=".45" /><stop offset="1" stopColor="#b4552a" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}-trail`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ffc98a" stopOpacity=".55" /><stop offset="1" stopColor="#ffc98a" stopOpacity="0" /></linearGradient>
      <radialGradient id={`${id}-core`} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff1c9" /><stop offset=".35" stopColor="#ffc46e" /><stop offset="1" stopColor="#e8735a" stopOpacity="0" /></radialGradient>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      <Band id={id} x0={420} x1={-30} y0={10} y1={200} w={120} o={.8} glow="#d47f4c" />
      <Stars id={id} seed={19} n={460} y0={0} y1={330} />
      <Constellation ch="ƙ" x={62} y={62} s={1.25} tw={0} />
      <Constellation ch="ɗ" x={250} y={40} s={1.15} tw={1.5} />
      <Constellation ch="ɓ" x={316} y={170} s={.95} tw={3} />
      <rect width={W} height={H} fill={`url(#${id}-fire)`} />
      <g>{sparks}</g>
      <path d="M0 350 C80 342 150 346 200 344 S320 338 400 346 L400 520 L0 520Z" fill="#0a0605" />
      <path d="M0 350 C80 342 150 346 200 344 S320 338 400 346" fill="none" stroke="#e8935a" strokeWidth=".8" opacity=".35" />
      <ellipse cx="200" cy="341" rx="26" ry="14" fill={`url(#${id}-core)`} className="mart-fire" />
      <ellipse cx="200" cy="348" rx="80" ry="12" fill="#ffb25e" opacity=".25" filter={`url(#${id}-soft)`} />
      <Grain id={id} />
    </svg>
  );
}

/* ---------------------------------------------------------------- Kora: two languages, one instrument */
function Kora() {
  const id = "m-kor", n = 21, bx = 200, by = 352;
  const strings: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), tx = 40 + u * 320, ty = 46 + Math.abs(u - .5) * 64;
    const len = Math.hypot(tx - bx, ty - by), nx = -(ty - by) / len, ny = (tx - bx) / len;
    const amp = (1.2 + 5 * Math.sin(u * Math.PI)) * (i % 2 ? 1 : -1), k = 2 + (i % 3);
    const pts = Array.from({ length: 33 }, (_, j) => {
      const t = j / 32, d = amp * Math.sin(t * Math.PI * k) * Math.sin(t * Math.PI);
      return `${f(bx + (tx - bx) * t + nx * d)},${f(by + (ty - by) * t + ny * d)}`;
    }).join(" ");
    const c = u < .5 ? `rgb(${255},${Math.round(180 + u * 60)},${Math.round(135 + u * 120)})` : `rgb(${Math.round(255 - (u - .5) * 90)},${Math.round(210 + (u - .5) * 20)},${Math.round(195 + (u - .5) * 80)})`;
    strings.push(<polyline key={i} className="mart-str" style={{ animationDelay: `${f(i * .23)}s` }} points={pts} fill="none" stroke={c} strokeWidth=".9" opacity=".8" />);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Defs id={id} nebula={[.86, .8, .9]} seed={37} />
      <linearGradient id={`${id}-sky`} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#07070c" /><stop offset=".45" stopColor="#0f0c10" /><stop offset=".8" stopColor="#1c1410" /><stop offset="1" stopColor="#2a1a12" />
      </linearGradient>
      <radialGradient id={`${id}-moon`} cx=".78" cy=".18" r=".42"><stop offset="0" stopColor="#e9eefc" stopOpacity=".32" /><stop offset="1" stopColor="#e9eefc" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-gourd`} cx=".5" cy=".25" r=".75"><stop offset="0" stopColor="#3a2216" /><stop offset=".6" stopColor="#140c09" /><stop offset="1" stopColor="#0a0706" /></radialGradient>
      <linearGradient id={`${id}-rim`} x1="0" x2="1"><stop offset="0" stopColor="#f6b48a" /><stop offset=".5" stopColor="#f4ece2" /><stop offset="1" stopColor="#c9d4f0" /></linearGradient>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      <Band id={id} x0={-30} x1={430} y0={230} y1={30} w={110} o={.55} glow="#b8a6c0" />
      <rect width={W} height={H} fill={`url(#${id}-moon)`} />
      <Stars id={id} seed={53} n={400} y0={0} y1={340} warm={.6} />
      <circle cx="312" cy="92" r="15" fill="#f4ece2" opacity=".92" />
      <circle cx="312" cy="92" r="40" fill="#e9eefc" opacity=".14" filter={`url(#${id}-soft)`} />
      <g filter={`url(#${id}-glow)`} opacity=".85">{strings}</g>
      <g>{strings}</g>
      <circle cx={bx} cy="500" r="160" fill={`url(#${id}-gourd)`} />
      <path d="M40 500 A160 160 0 0 1 360 500" fill="none" stroke={`url(#${id}-rim)`} strokeWidth="1.2" opacity=".6" />
      <rect x={bx - 2} y={by - 10} width="4" height="24" rx="2" fill="#ffd9bb" opacity=".8" />
      <Grain id={id} />
    </svg>
  );
}

export function ModelArt({ model }: { model: "speech" | "transcribe" | "translate" }) {
  return model === "speech" ? <Tafiya /> : model === "transcribe" ? <Tatsuniya /> : <Kora />;
}
