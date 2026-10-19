"use client";

/* The voice reel and Aïr's orb for the home page console. Every orb in a scene is painted on one canvas
   (src/lib/orbGL.ts). The reel follows elevenlabs.io's: the chosen voice large in the middle, the others
   smaller towards the edges (sizes 1, .79, .57, .43), and it goes round without end. It moves on a spring,
   so a run of clicks glides instead of stopping and starting, and it can be dragged or swiped and flicked.
   A click on a side orb brings it to the middle; a click on the middle one plays it. */
import { useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from "react";
import { Icon } from "./Icon";
import { createOrbRenderer, type OrbDraw, type OrbRenderer } from "@/lib/orbGL";
import type { Voice } from "@/content/playground";

const SCALE = [1, 0.787, 0.567, 0.4255, 0.33];
const SPREAD = [0, 1.21, 2.08, 2.69, 3.15];   // distance from the middle, in orb widths
const lerpAt = (table: number[], d: number) => { const a = Math.min(Math.abs(d), table.length - 1.001), i = Math.floor(a), f = a - i; return table[i] + (table[i + 1] - table[i]) * f; };
const mod = (a: number, n: number) => ((a % n) + n) % n;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Runs `frame(dt)` every animation frame while the element is on screen and the page is visible; off screen
   the loop only checks, so a hidden console costs next to nothing. */
function useFrames(el: MutableRefObject<HTMLElement | null>, frame: (dt: number, now: number) => void) {
  const ref = useRef(frame); ref.current = frame;
  useEffect(() => {
    const node = el.current; if (!node) return;
    let raf = 0, last = 0;
    const loop = (now: number) => {
      const r = node.getBoundingClientRect();
      if (!document.hidden && r.bottom > 0 && r.top < window.innerHeight && r.width > 0) {
        const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now; ref.current(dt, now);
      } else last = 0;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [el]);
}

/* A canvas that keeps its renderer sized to its box. */
function useRenderer(canvas: MutableRefObject<HTMLCanvasElement | null>) {
  const r = useRef<OrbRenderer | null>(null);
  const box = useRef({ w: 0, h: 0 });
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    try { r.current = createOrbRenderer(c); } catch { r.current = null; }
    const ro = new ResizeObserver(([e]) => { box.current = { w: e.contentRect.width, h: e.contentRect.height }; r.current?.size(box.current.w, box.current.h); });
    ro.observe(c);
    return () => { ro.disconnect(); r.current?.destroy(); r.current = null; };
  }, [canvas]);
  return { r, box };
}

type ReelProps = {
  voices: Voice[];
  index: number;                         // the chosen voice
  onIndex: (i: number) => void;
  playing: boolean;
  onPlay: () => void;
  amp: MutableRefObject<number>;
  labels: { play: string; stop: string; previous: string; next: string; voices: string };
};

export function VoiceReel({ voices, index, onIndex, playing, onPlay, amp, labels }: ReelProps) {
  const n = voices.length;
  const host = useRef<HTMLDivElement | null>(null), canvas = useRef<HTMLCanvasElement | null>(null), sizer = useRef<HTMLDivElement | null>(null);
  const { r, box } = useRenderer(canvas);
  const s = useRef({ pos: index, vel: 0, target: index, drag: null as null | { x: number; pos: number; moved: number; t: number; v: number }, clocks: voices.map((_, i) => i * 3.1) });
  const [base, setBase] = useState(index);   // the window of orbs and names in the page follows the reel
  const labelEls = useRef(new Map<number, HTMLDivElement>());
  const playEl = useRef<HTMLButtonElement | null>(null);
  const reduce = useRef(false);
  useEffect(() => { reduce.current = reducedMotion(); }, []);

  /* the chosen voice changed from outside (or from us): aim the reel at it the short way round */
  useEffect(() => {
    const st = s.current, cur = mod(Math.round(st.target), n);
    if (cur === index) return;
    let d = index - cur; if (d > n / 2) d -= n; if (d < -n / 2) d += n;
    st.target = Math.round(st.target) + d;
  }, [index, n]);

  const geometry = () => {
    const D = sizer.current?.offsetWidth || 256, W = box.current.w || host.current?.offsetWidth || 800;
    const spread = Math.min(1, (0.53 * W) / (SPREAD[1] * D));
    return { D, W, spread, cy: (box.current.h || D * 1.1) / 2 };
  };
  const layout = (d: number, g: ReturnType<typeof geometry>) => ({
    x: g.W / 2 + Math.sign(d) * lerpAt(SPREAD, d) * g.D * g.spread,
    scale: lerpAt(SCALE, d),
    alpha: 1 - Math.max(0, Math.min(1, (Math.abs(d) - 3) / 0.8)),
  });

  useFrames(host, (dt) => {
    const st = s.current, g = geometry();
    if (!st.drag) {
      if (reduce.current) { st.pos = st.target; st.vel = 0; }
      else {   /* a critically damped spring: quick to start, no overshoot */
        const k = 110, c = 2 * Math.sqrt(k);
        st.vel += (k * (st.target - st.pos) - c * st.vel) * dt;
        st.pos += st.vel * dt;
        if (Math.abs(st.target - st.pos) < 0.0005 && Math.abs(st.vel) < 0.001) { st.pos = st.target; st.vel = 0; }
      }
    }
    const b = Math.round(st.pos);
    if (b !== base) setBase(b);
    const a = amp.current, midVoice = mod(b, n);
    if (!reduce.current) for (let vi = 0; vi < n; vi++) st.clocks[vi] += dt * (0.055 + (vi === midVoice && playing ? 0.12 + 0.45 * a : 0));   // a speaking voice flows faster
    const orbs: OrbDraw[] = [];
    for (let v = b - 4; v <= b + 4; v++) {
      const d = v - st.pos, L = layout(d, g), vi = mod(v, n), mid = Math.abs(d) < 0.5;
      const speaking = mid && playing ? a : 0;
      orbs.push({ x: L.x, y: g.cy, r: (g.D / 2) * L.scale * (1 + 0.025 * speaking), palette: voices[vi].palette, seed: vi * 7.31 + 1.7, time: st.clocks[vi], amp: speaking, alpha: L.alpha });
      const label = labelEls.current.get(v);
      if (label) {
        const side = Math.abs(d), show = g.spread > 0.95 ? Math.max(0, 1 - Math.max(0, side - 1) / 0.6) : Math.max(0, 1 - side / 0.6);
        label.style.transform = `translateX(${(L.x - g.W / 2).toFixed(1)}px)`;
        label.style.opacity = show.toFixed(3);
        label.style.setProperty("--ink-mix", Math.min(1, side).toFixed(3));
      }
    }
    orbs.sort((p, q) => p.r - q.r);   // small ones first, the middle one on top
    r.current?.draw(orbs);
    const settled = Math.abs(st.pos - st.target) < 0.12 && !st.drag;
    playEl.current?.classList.toggle("on", settled);
  });

  /* dragging and flicking; a click without a drag picks the orb under the pointer */
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const st = s.current;
    st.drag = { x: e.clientX, pos: st.pos, moved: 0, t: performance.now(), v: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const st = s.current, dr = st.drag; if (!dr) return;
    const g = geometry(), step = SPREAD[1] * g.D * g.spread, now = performance.now();
    const pos = dr.pos - (e.clientX - dr.x) / step;
    const dtm = Math.max(1, now - dr.t);
    dr.v = 0.7 * dr.v + 0.3 * ((pos - st.pos) / dtm) * 1000;
    dr.t = now; dr.moved = Math.max(dr.moved, Math.abs(e.clientX - dr.x));
    st.pos = pos;
  };
  const onUp = (e: React.PointerEvent) => {
    const st = s.current, dr = st.drag; if (!dr) return;
    st.drag = null;
    if (dr.moved > 6) {   /* let go: carry on in the direction of the flick, then settle on a voice */
      st.vel = dr.v;
      st.target = Math.round(st.pos + Math.max(-2, Math.min(2, dr.v * 0.18)));
      onIndex(mod(st.target, n));
      return;
    }
    const g = geometry(), rect = host.current!.getBoundingClientRect(), px = e.clientX - rect.left, py = e.clientY - rect.top;
    for (let v = Math.round(st.pos) - 3; v <= Math.round(st.pos) + 3; v++) {
      const d = v - st.pos, L = layout(d, g);
      if (Math.hypot(px - L.x, py - g.cy) < (g.D / 2) * L.scale) {
        if (Math.abs(d) < 0.5) onPlay(); else { st.target = v; onIndex(mod(v, n)); }
        return;
      }
    }
  };
  const turn = (d: number) => { const st = s.current; st.target = Math.round(st.target) + d; onIndex(mod(st.target, n)); };

  const items = [];
  for (let v = base - 3; v <= base + 3; v++) items.push(v);
  const chosen = voices[mod(index, n)];

  return (
    <div className="vr" role="group" aria-roledescription="carousel" aria-label={labels.voices}
      tabIndex={0} onKeyDown={(e) => { if (e.key === "ArrowLeft") { e.preventDefault(); turn(-1); } if (e.key === "ArrowRight") { e.preventDefault(); turn(1); } }}>
      <div className="vr-sizer" ref={sizer} aria-hidden="true" />
      <div className="vr-stage" ref={host} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <canvas ref={canvas} className="vr-canvas" aria-hidden="true" />
        <button ref={playEl} type="button" className="vr-play" aria-label={playing ? labels.stop : `${labels.play}: ${chosen.name}`} onClick={onPlay}>
          <Icon name={playing ? "pause" : "play"} size={22} stroke={1.8} />
        </button>
      </div>
      <div className="vr-names" aria-hidden="true">
        {items.map(v => {
          const voice = voices[mod(v, n)];
          return <div key={v} className="vr-name" ref={el => { if (el) labelEls.current.set(v, el); else labelEls.current.delete(v); }}><b>{voice.name}</b><span>{voice.note}</span></div>;
        })}
        <button type="button" className="vr-arrow prev" aria-label={labels.previous} onClick={() => turn(-1)}><Icon name="chevron" size={18} stroke={1.6} className="rot90" /></button>
        <button type="button" className="vr-arrow next" aria-label={labels.next} onClick={() => turn(1)}><Icon name="chevron" size={18} stroke={1.6} className="rot-90" /></button>
      </div>
      <p className="sr-only" aria-live="polite">{chosen.name}. {chosen.note}</p>
    </div>
  );
}

/* Aïr on a call: one orb, the same paint, breathing with the conversation. */
export function AgentOrb({ palette, amp, live, style }: { palette: Voice["palette"]; amp: MutableRefObject<number>; live: boolean; style?: CSSProperties }) {
  const host = useRef<HTMLDivElement | null>(null), canvas = useRef<HTMLCanvasElement | null>(null);
  const { r, box } = useRenderer(canvas);
  const clock = useRef(2.4), reduce = useRef(false);
  useEffect(() => { reduce.current = reducedMotion(); }, []);
  useFrames(host, (dt) => {
    const a = amp.current, { w, h } = box.current;
    if (!w) return;
    if (!reduce.current) clock.current += dt * (0.055 + (live ? 0.12 + 0.45 * a : 0));
    r.current?.draw([{ x: w / 2, y: h / 2, r: (Math.min(w, h) / 2) * (0.94 + 0.04 * a), palette, seed: 11.3, time: clock.current, amp: a }]);
  });
  return <div className="vr-agent" ref={host} style={style}><canvas ref={canvas} className="vr-canvas" aria-hidden="true" /></div>;
}
