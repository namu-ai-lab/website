// @ts-nocheck — ported verbatim from ~/Desktop/Namu/lab-web-mastery/studies/test-set.js (tested there).
// Client-only: call these from useEffect. TODO: add types.
const global: any = typeof window !== "undefined" ? window : {};

/* Who is in the test set — every utterance of the FLEURS Hausa test split.
 *
 * One mark per utterance, in file order, all the same size so that colour
 * is the only variable: 620 marks in Kola, one in Sahel. Each mark's
 * tooltip carries its length. Real,
 * public data (window.FLEURS_HA_TEST); nothing here is estimated.
 */

  /* Every word the engine writes. English is the default; pass `strings` (any subset) to localise.
   * Values go into innerHTML and attributes, so they must be plain text without < & or ". */
  const TEST_SET_STRINGS = {
    utterances: "Utterances",              // stat labels
    hours: "Hours",
    female: "Recorded female",
    male: "Recorded male",
    decimal: ".",                          // decimal separator in hours and lengths
    seconds: " s",                         // unit after a length, with its space
    // Tooltip of one mark: its 1-based number, its formatted length, whether it is recorded male.
    mark: (n, length, isMale) => `Utterance ${n} · ${length} · recorded ${isMale ? "male" : "female"}`,
    // aria-label of the whole strip.
    summary: (n, female, male) => `${n} utterances: ${female} recorded female, ${male} recorded male`,
    // Callout under the one mark recorded male.
    callout: n => `utterance ${n} · the only voice recorded as male`,
  };

  function createTestSet(root, data, { cols = 104, caption, animate = true, strings = TEST_SET_STRINGS } = {}) {
    const S = { ...TEST_SET_STRINGS, ...strings };
    const dec = text => text.replace(".", S.decimal);
    const { d, male } = data;
    const n = d.length, rows = Math.ceil(n / cols);
        const markW = 3.6, gapX = 6, rowH = 18, gapY = 14;
    const W = cols * (markW + gapX) - gapX, H = rows * (rowH + gapY) - gapY;
    const isMale = new Set(male);
    const total = d.reduce((a, b) => a + b, 0);
    const reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let marks = "";
    d.forEach((sec, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const h = rowH;
      const x = c * (markW + gapX), y = r * (rowH + gapY);
      marks += `<rect class="ts-mark${isMale.has(i) ? " is-other" : ""}" x="${x}" y="${y.toFixed(1)}" width="${markW}" height="${h.toFixed(1)}" rx="1" style="--i:${i}"><title>${S.mark(i + 1, dec(sec.toFixed(1)) + S.seconds, isMale.has(i))}</title></rect>`;
    });
    const mi = male[0], mr = Math.floor(mi / cols), mc = mi % cols;
    const mx = mc * (markW + gapX) + markW / 2, my = mr * (rowH + gapY) + rowH;

    root.classList.add("ts");
    root.innerHTML = `
      <dl class="ts-stats">
        <div><dt>${S.utterances}</dt><dd>${n}</dd></div>
        <div><dt>${S.hours}</dt><dd>${dec((total / 3600).toFixed(2))}</dd></div>
        <div><dt>${S.female}</dt><dd>${n - male.length}</dd></div>
        <div><dt>${S.male}</dt><dd class="is-other">${male.length}</dd></div>
      </dl>
      <figure class="ts-figure">
        <svg viewBox="-2 -2 ${W + 4} ${H + 44}" width="${W + 4}" height="${H + 44}" role="img" aria-label="${S.summary(n, n - male.length, male.length)}">
          <g class="ts-marks">${marks}</g>
          <g class="ts-callout" transform="translate(${mx} ${my})">
            <path d="M0 3 H ${(markW + gapX) / 2} V ${H - my + 22}" />
            <text x="${(markW + gapX) / 2 - 6}" y="${H - my + 32}" text-anchor="end">${S.callout(mi + 1)}</text>
          </g>
        </svg>
        ${caption ? `<figcaption>${caption}</figcaption>` : ""}
      </figure>`;

    function replay() {
      if (reduce) return;
      root.classList.remove("is-in"); root.classList.add("is-waiting");
      void root.offsetWidth;
      requestAnimationFrame(() => root.classList.replace("is-waiting", "is-in"));
    }
    if (!animate) { root.classList.add("is-in"); return { replay, destroy() {} }; }
    let io = null;
    if (!reduce) {
      root.classList.add("is-waiting");
      io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        requestAnimationFrame(() => root.classList.replace("is-waiting", "is-in"));
      }, { threshold: 0.35 });
      io.observe(root);
    } else root.classList.add("is-in");
    return { replay, destroy() { io?.disconnect(); } };
  }

export { createTestSet, TEST_SET_STRINGS };
