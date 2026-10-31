// @ts-nocheck — ported verbatim from ~/Desktop/Namu/lab-web-mastery/studies/utterance.js (tested there).
// Client-only: call these from useEffect. TODO: add types.
const global: any = typeof window !== "undefined" ? window : {};

/* Life of an utterance — one phone recording on its way into a dataset.
 *
 * Five stages share one picture: the waveform is recorded, segmented by
 * voice activity, aligned word by word, normalised to Hausa orthography,
 * then checked by a native speaker against the speaker's consent scopes.
 * The transcript and timings are illustrative; the steps are the real ones.
 */

  function rng(seed) {
    return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }

  /* Every word the engine writes. English is the default; pass `strings` (any subset, and any
   * subset of stages) in the spec to localise. Values go into innerHTML and attributes, so they
   * must be plain text without < & or ". Consent scope names come from the spec. */
  const UTTERANCE_STRINGS = {
    stagesLabel: "Stages",                 // tablist aria-label
    consentLabel: "Consent scopes",        // consent chips aria-label
    allowed: " — allowed",                 // screen-reader suffix after a scope
    notAllowed: " — not allowed",
    stages: {
      recorded: { label: "Recorded", note: "A phone call, narrowband. Silence, line noise and speech arrive together." },
      segmented: { label: "Segmented", note: "Voice activity detection keeps the speech and sets the silence aside." },
      aligned: { label: "Aligned", note: "Forced alignment ties each written word to its span of audio." },
      normalised: { label: "Normalised", note: "One orthography: hooked letters restored, numerals written as words, one apostrophe (ʼ)." },
      checked: { label: "Checked", note: "A native speaker confirms the text. The speaker's consent decides where it may be used." },
    },
  };
  const STAGE_IDS = ["recorded", "segmented", "aligned", "normalised", "checked"];

  function createUtterance(root, spec) {
    const { words, speech, consent } = spec;
    const S = { ...UTTERANCE_STRINGS, ...(spec.strings || {}) };
    const STAGES = STAGE_IDS.map(id => ({ id, ...UTTERANCE_STRINGS.stages[id], ...((S.stages || {})[id] || {}) }));
    const reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.add("lu");
    const N = 156, rand = rng(spec.seed || 42);
    // Bar energies: speech rises and falls in syllables; gaps are low line noise.
    const inSpeech = i => speech.some(([a, b]) => i >= a * N && i < b * N);
    let phase = 0, rate = 0.42;
    const energy = Array.from({ length: N }, (_, i) => {
      if (!inSpeech(i)) return 0.03 + 0.06 * rand();
      phase += rate * (0.75 + 0.5 * rand());
      const syllable = Math.pow(Math.abs(Math.sin(phase)), 1.4);
      return 0.12 + 0.88 * syllable * (0.7 + 0.3 * rand());
    });

    root.innerHTML = `
      <ol class="lu-steps" role="tablist" aria-label="${S.stagesLabel}"></ol>
      <div class="lu-figure">
        <div class="lu-wave" aria-hidden="true"></div>
        <div class="lu-words"></div>
        <div class="lu-consent" aria-label="${S.consentLabel}"></div>
      </div>
      <p class="lu-note" aria-live="polite"></p>`;
    const steps = root.querySelector(".lu-steps");
    STAGES.forEach((s, i) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "tab"); b.dataset.i = i;
      b.innerHTML = `<span class="lu-idx">${String(i + 1).padStart(2, "0")}</span><span>${s.label}</span>`;
      li.append(b); steps.append(li);
    });

    const wave = root.querySelector(".lu-wave");
    energy.forEach((e, i) => {
      const bar = document.createElement("i");
      bar.style.setProperty("--h", e.toFixed(3));
      bar.style.setProperty("--d", (i * 6) + "ms");
      if (inSpeech(i)) bar.className = "is-speech";
      wave.append(bar);
    });
    speech.forEach(([a, b]) => {
      const seg = document.createElement("span");
      seg.className = "lu-seg";
      seg.style.left = (a * 100) + "%"; seg.style.width = ((b - a) * 100) + "%";
      wave.append(seg);
    });

    const wordsEl = root.querySelector(".lu-words");
    words.forEach((w, i) => {
      const span = document.createElement("span");
      span.className = "lu-word" + (w.clean !== w.raw ? " is-changed" : "");
      span.style.left = (w.at * 100) + "%";
      span.style.setProperty("--d", (i * 70) + "ms");
      span.lang = "ha";
      span.innerHTML = `<span class="lu-raw">${w.raw}</span><span class="lu-clean">${w.clean}</span>`;
      wordsEl.append(span);
    });

    const consentEl = root.querySelector(".lu-consent");
    consent.forEach(c => {
      const chip = document.createElement("span");
      chip.className = "lu-chip " + (c.allowed ? "is-yes" : "is-no");
      chip.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${c.allowed ? '<path d="M3.5 8.5l3 3 6-7"/>' : '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>'}</svg>${c.scope}<span class="sr-only">${c.allowed ? S.allowed : S.notAllowed}</span>`;
      consentEl.append(chip);
    });

    const note = root.querySelector(".lu-note");
    let stage = 0, timer = 0, auto = !reduce;
    function go(i, fromUser) {
      stage = i;
      root.dataset.stage = STAGES[i].id;
      STAGES.forEach((s, k) => root.classList.toggle("past-" + s.id, k <= i));
      steps.querySelectorAll("button").forEach((b, k) => {
        b.setAttribute("aria-selected", String(k === i));
        b.classList.toggle("is-done", k < i);
      });
      note.textContent = STAGES[i].note;
      if (fromUser) { auto = false; clearTimeout(timer); }
      else if (auto) {
        clearTimeout(timer);
        // One pass, then rest on the last stage (self-starting motion must come to rest).
        if (stage < STAGES.length - 1) timer = setTimeout(() => go(stage + 1), 2600);
        else auto = false;
      }
    }
    steps.addEventListener("click", e => { const b = e.target.closest("button"); if (b) go(+b.dataset.i, true); });
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && auto) go(stage);
      else clearTimeout(timer);
    }, { threshold: 0.4 });
    io.observe(root);
    go(reduce ? STAGES.length - 1 : 0, reduce);
    return { go, destroy() { io.disconnect(); clearTimeout(timer); } };
  }

export { createUtterance, UTTERANCE_STRINGS };
