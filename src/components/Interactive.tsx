"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

/** A horizontal card rail with DeepMind's prev/next control. Scrolls natively (touch, trackpad, keys). */
export function Rail({ children, label, className = "rail", prev = "Previous", next = "Next" }: { children: ReactNode; label: string; className?: string; prev?: string; next?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const on = () => setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    on(); el.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on);
    return () => { el.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  const go = (dir: number) => {
    const el = ref.current; if (!el) return;
    const item = el.firstElementChild as HTMLElement | null;
    const step = item ? item.offsetWidth + parseFloat(getComputedStyle(el).columnGap || "0") : el.clientWidth * .8;
    el.scrollBy({ left: dir * step, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return (
    <>
      <div ref={ref} className={className} role="region" aria-label={label} tabIndex={0}>{children}</div>
      <div className="rail-ctrl">
        <button type="button" aria-label={prev} disabled={edge.start} onClick={() => go(-1)}><Icon name="chevron" size={18} stroke={1.6} className="rot90" /></button>
        <button type="button" aria-label={next} disabled={edge.end} onClick={() => go(1)}><Icon name="chevron" size={18} stroke={1.6} className="rot-90" /></button>
      </div>
    </>
  );
}

/** List on the left, artwork on the right (DeepMind's podcast block). Advances on its own until touched. */
export function Explorer({ items, stages }: { items: { title: string; note: string; body: string }[]; stages: ReactNode }) {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!auto || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: .4 });
    if (root.current) io.observe(root.current);
    const t = setInterval(() => { if (visible && !document.hidden) setI(v => (v + 1) % items.length); }, 6000);
    return () => { clearInterval(t); io.disconnect(); };
  }, [auto, items.length]);
  const kids = Children.toArray(stages);
  return (
    <div className="explorer" ref={root}>
      <ul className="ex-list" role="tablist" aria-orientation="vertical">
        {items.map((it, k) => (
          <li key={k}>
            <button type="button" role="tab" aria-selected={i === k} aria-controls={`ex-stage-${k}`} id={`ex-tab-${k}`}
              onClick={() => { setI(k); setAuto(false); }}
              onKeyDown={e => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const n = (k + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; setI(n); setAuto(false); (document.getElementById(`ex-tab-${n}`) as HTMLElement)?.focus(); } }}>
              <span className="t">{it.title}<small>{it.note}</small></span>
              <span className="d"><span><span className="p">{it.body}</span></span></span>
            </button>
          </li>
        ))}
      </ul>
      <div className="ex-stage">
        {kids.map((k, n) => <div key={n} id={`ex-stage-${n}`} role="tabpanel" aria-labelledby={`ex-tab-${n}`} className={n === i ? "on" : ""} hidden={n !== i ? undefined : undefined} aria-hidden={n !== i}>{k}</div>)}
      </div>
    </div>
  );
}

/** Adds .in to every .reveal element as it enters the viewport.
    Nothing is hidden until this has run, so the page as served shows everything: without JS, if the bundle fails, and
    while a slow phone is still hydrating (the first screen, often the LCP element, must not wait for JavaScript). The
    first time it runs, whatever is already on screen (or scrolled past) is kept as it is; only what is still below the
    fold is hidden (html.reveal-on), to fade in on the way down. Later client navigations reveal their pages as before. */
export function Reveal() {
  useEffect(() => {
    const root = document.documentElement;
    const els = [...document.querySelectorAll<HTMLElement>(".reveal:not(.in)")];
    if (!root.classList.contains("reveal-on")) {
      for (const el of els) if (el.getBoundingClientRect().top < innerHeight) el.classList.add("in");
      root.classList.add("reveal-on");
    }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    els.forEach(el => { if (!el.classList.contains("in")) io.observe(el); });
    return () => io.disconnect();
  });
  return null;
}
