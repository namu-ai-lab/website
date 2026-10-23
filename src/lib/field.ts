// @ts-nocheck — ported verbatim from ~/Desktop/Namu/lab-web-mastery/studies/listening-field.js (tested there).
// TODO: add types. Only the procedural speech is kept here; components/Art.tsx draws it. The study's canvas renderer
// (createListeningField) and its pitch-contour variant (synthesiseContours) were never used on the site and are gone.

/* Listening Field — a spectrogram drawn as Sahel ridgelines.
 *
 * x is time (speech flows in from the right), each line is one frequency band.
 * Low bands sit in front and carry the big dunes; high bands recede into haze.
 * One line, the pitch track, is drawn in Sahel: in a tonal language the
 * contour of the voice is meaning, so it is the one thing in colour.
 *
 * The speech here is procedural (syllables, formants, fricatives, tone steps)
 * so the study needs no recordings. On the real site the same renderer takes
 * frames from a consented Hausa recording or a live AnalyserNode.
 */

  // Small seeded PRNG so every visit draws the same "sentence".
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Mel scale band centres between lo and hi Hz.
  function melBands(n, lo, hi) {
    const mel = f => 2595 * Math.log10(1 + f / 700);
    const inv = m => 700 * (Math.pow(10, m / 2595) - 1);
    const a = mel(lo), b = mel(hi), out = [];
    for (let i = 0; i < n; i++) out.push(inv(a + (b - a) * (i / (n - 1))));
    return out;
  }

  /* Build a looping "utterance": frames x bands energy in [0,1], plus a pitch
   * track (Hz, 0 when unvoiced). 20 ms frames. */
  /* Source-filter speech: a glottal source (harmonics of F0 with a −12 dB/oct
   * tilt) shaped by a vocal-tract filter (three formants that glide between
   * vowels), plus frication noise and plosive bursts. Crude, but it has the
   * texture of real speech: harmonic striations low down, smeared energy up
   * high, syllables of uneven length, tone steps, pauses that breathe. */
  function synthesise({ seconds = 24, bands = 34, seed = 7 } = {}) {
    const rnd = mulberry32(seed);
    const frameMs = 20, n = Math.round((seconds * 1000) / frameMs);
    const centres = melBands(bands, 90, 7600);
    const widths = centres.map((c, i) => (i ? c - centres[i - 1] : centres[1] - c) * 0.9 + 25);
    const E = Array.from({ length: n }, () => new Float32Array(bands));
    const F0 = new Float32Array(n);
    const vowels = [ // F1, F2, F3 for a, e, i, o, u (adult, rough)
      [760, 1320, 2500], [470, 1980, 2650], [310, 2300, 3000], [500, 900, 2450], [340, 860, 2300],
    ];
    const formantEnv = (f, F) =>
      1.0 * Math.exp(-Math.pow((f - F[0]) / 130, 2)) +
      0.62 * Math.exp(-Math.pow((f - F[1]) / 190, 2)) +
      0.32 * Math.exp(-Math.pow((f - F[2]) / 260, 2)) +
      0.08;
    let prevV = vowels[0];
    let t = 4;
    while (t < n - 60) {
      const syllables = 4 + Math.floor(rnd() * 10);
      const register = 105 + rnd() * 80;
      const loud = 0.75 + rnd() * 0.25;
      for (let s = 0; s < syllables && t < n - 40; s++) {
        const decl = 1 - 0.22 * (s / syllables);
        const tone = rnd() < 0.5 ? 1.18 : 0.88;            // H or L
        const falling = rnd() < 0.15;                       // an occasional fall
        const fric = rnd() < 0.34, plos = !fric && rnd() < 0.42;
        const onset = fric ? 3 + Math.floor(rnd() * 4) : plos ? 2 : 0;
        const nucleus = 4 + Math.floor(rnd() * 6) + (rnd() < 0.25 ? 5 : 0); // long vowels
        const V = vowels[Math.floor(rnd() * vowels.length)];
        const fricCentre = 3600 + rnd() * 3200;
        for (let k = 0; k < onset && t + k < n; k++) {
          const row = E[t + k];
          for (let b = 0; b < bands; b++) {
            const f = centres[b];
            if (fric) row[b] += 0.42 * loud * Math.exp(-Math.pow((f - fricCentre) / 1500, 2)) * (0.55 + 0.45 * rnd());
            else if (k === 0) row[b] += 0.3 * loud * (0.5 + 0.5 * rnd()) * Math.exp(-f / 5000);
          }
        }
        t += onset;
        for (let k = 0; k < nucleus && t + k < n; k++) {
          const u = (k + 0.5) / nucleus;
          const env = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.7) * loud;
          const F = [0, 1, 2].map(i => prevV[i] + (V[i] - prevV[i]) * Math.min(1, u * 2.2)); // coarticulation
          const f0 = register * decl * (falling ? tone * (1.1 - 0.25 * u) : tone) * (1 + 0.012 * (rnd() - 0.5));
          F0[t + k] = f0;
          const row = E[t + k];
          for (let b = 0; b < bands; b++) {
            const f = centres[b], w = widths[b];
            let src = 0;
            for (let h = 1; h <= 28; h++) {
              const fh = h * f0;
              if (fh > f + 2 * w) break;
              if (fh < f - 2 * w) continue;
              src += Math.exp(-Math.pow((f - fh) / (w * 0.55), 2)) / Math.pow(h, 0.9);
            }
            row[b] += env * src * formantEnv(f, F) * (0.9 + 0.1 * rnd());
          }
        }
        prevV = V;
        t += nucleus + (rnd() < 0.18 ? 1 + Math.floor(rnd() * 3) : 0);
      }
      t += 10 + Math.floor(rnd() * 28);
    }
    // Normalise per band so the high bands still read, compress, add a floor.
    for (let b = 0; b < bands; b++) {
      let max = 1e-6;
      for (let i = 0; i < n; i++) max = Math.max(max, E[i][b]);
      const tilt = 0.55 + 0.45 * (1 - b / (bands - 1));       // keep a natural tilt
      const col = new Float32Array(n);
      for (let i = 0; i < n; i++) col[i] = E[i][b] / max;
      // Forward-backward smoothing: soft attacks and releases, no glitch spikes.
      for (let pass = 0; pass < 1; pass++) {
        let prev = col[0];
        for (let i = 0; i < n; i++) { prev = 0.62 * col[i] + 0.38 * prev; col[i] = prev; }
        prev = col[n - 1];
        for (let i = n - 1; i >= 0; i--) { prev = 0.62 * col[i] + 0.38 * prev; col[i] = prev; }
      }
      for (let i = 0; i < n; i++) {
        E[i][b] = Math.min(1, tilt * Math.log1p(14 * col[i]) / Math.log(15)) + 0.014 * rnd();
      }
    }
    return { E, F0, frames: n, bands, centres };
  }

export { synthesise };
