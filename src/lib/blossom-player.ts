// Ported from ~/Desktop/Namu/lab-web-mastery/studies/blossom-player.js (tested there), now typed, and building its
// nodes with textContent rather than an innerHTML template. Client-only: call it from useEffect.
import { formatSeconds } from "@/i18n/format";

/* Blossom player — the sample player whose progress draws the Namu mark.
 *
 * At rest the button shows the Blossom faintly, its Sahel dot where the logo
 * keeps it. On play the dot moves to the start of the arc and rides its tip
 * as the arc fills in; when the clip ends the arc is whole and the dot rests
 * where it belongs, so every listen ends on the mark. The transcript beside
 * it lights word by word from alignment times.
 *
 * Silent study: no consented recording exists yet, so the clock runs without
 * sound and the page says so. On the site the clock is audio.currentTime.
 */

  const ARC = "M 104 60 A 44 44 0 1 0 60 104"; // the Blossom's arc, from the icon file
  const SVG_NS = "http://www.w3.org/2000/svg";

  /* Every word the engine writes itself. English is the default; pass `strings` (any subset) to
   * localise. The label, gloss and note come from the caller and are shown as given. */
  export type BlossomStrings = {
    play: (label: string) => string;       // button aria-labels
    pause: (label: string) => string;
    replay: (label: string) => string;
    glossLang: string;                     // lang attribute of the gloss line
  };
  export const BLOSSOM_STRINGS: BlossomStrings = {
    play: label => `Play ${label}`,
    pause: label => `Pause ${label}`,
    replay: label => `Replay ${label}`,
    glossLang: "en",
  };

  export type BlossomWord = { w: string; start: number; end: number };
  export type BlossomOptions = { words: BlossomWord[]; duration: number; label: string; gloss: string; note?: string; strings?: Partial<BlossomStrings> };

  /* an element with its attributes and children, in the HTML or the SVG namespace */
  function html<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string>, ...kids: (Node | string)[]) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    n.append(...kids);
    return n;
  }
  function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>, ...kids: Node[]) {
    const n = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    n.append(...kids);
    return n;
  }

  export function createBlossomPlayer(root: HTMLElement, { words, duration, label, gloss, note, strings = BLOSSOM_STRINGS }: BlossomOptions) {
    const S: BlossomStrings = { ...BLOSSOM_STRINGS, ...strings };
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.add("bp");

    const fill = svg("path", { class: "bp-fill", d: ARC, pathLength: "1" });
    const dot = svg("circle", { class: "bp-dot", r: "7.5", cx: "60", cy: "104" });
    const btn = html("button", { class: "bp-button", type: "button", "aria-label": S.play(label) },
      svg("svg", { viewBox: "0 0 120 120", "aria-hidden": "true" },
        svg("path", { class: "bp-track", d: ARC }),
        fill,
        dot,
        svg("path", { class: "bp-glyph bp-play", d: "M50 44v32l26-16z" }),
        svg("g", { class: "bp-glyph bp-pause" }, svg("path", { d: "M51 45v30M69 45v30" }))));
    const time = html("span", { class: "bp-time" }, `0:00 / ${formatSeconds(duration)}`);
    const wordsEl = html("p", { class: "bp-words", lang: "ha", "aria-hidden": "true" });
    root.replaceChildren(btn, html("div", { class: "bp-body" },
      html("div", { class: "bp-meta" }, html("span", { class: "bp-label" }, label), time),
      wordsEl,
      html("p", { class: "sr-only", lang: "ha" }, words.map(w => w.w).join(" ")),
      html("p", { class: "bp-gloss", lang: S.glossLang }, gloss),
      ...(note ? [html("p", { class: "bp-note" }, note)] : [])));

    const spans = words.map(({ w }) => {
      const s = document.createElement("span");
      s.textContent = w;
      wordsEl.append(s, " ");
      return s;
    });
    const total = fill.getTotalLength();

    let t = 0, playing = false, last = 0, raf = 0, started = false;
    function render() {
      const p = Math.min(1, t / duration);
      fill.style.strokeDashoffset = String(1 - p);
      const pt = fill.getPointAtLength((started ? p : 1) * total);
      dot.setAttribute("cx", pt.x.toFixed(2));
      dot.setAttribute("cy", pt.y.toFixed(2));
      time.textContent = `${formatSeconds(t)} / ${formatSeconds(duration)}`;
      // Binary search for the current word by start time.
      let lo = 0, hi = words.length - 1, cur = -1;
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (words[mid].start <= t) { cur = mid; lo = mid + 1; } else hi = mid - 1; }
      if (cur >= 0 && t > words[cur].end) cur = started && playing ? -1 : cur;
      spans.forEach((s, i) => {
        s.className = !started ? "" : i === cur && playing ? "is-current" : words[i].end <= t ? "is-spoken" : "is-unspoken";
      });
    }
    function frame(now: number) {
      t = Math.min(duration, t + (now - last) / 1000); last = now;
      render();
      if (t >= duration) { stop(true); return; }
      raf = requestAnimationFrame(frame);
    }
    function play() {
      if (t >= duration) t = 0;
      started = true; playing = true; root.classList.add("is-playing");
      btn.setAttribute("aria-label", S.pause(label));
      if (reduce) { t = duration; render(); stop(true); return; }
      last = performance.now(); raf = requestAnimationFrame(frame);
    }
    function stop(ended: boolean) {
      playing = false; root.classList.remove("is-playing");
      btn.setAttribute("aria-label", ended ? S.replay(label) : S.play(label));
      cancelAnimationFrame(raf);
      if (ended) { root.classList.add("is-ended"); render(); setTimeout(() => root.classList.remove("is-ended"), 1200); }
    }
    btn.addEventListener("click", () => (playing ? stop(false) : play()));
    render();
    return { play, pause: () => stop(false) };
  }
