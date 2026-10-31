/* Translating a video, one spoken stretch at a time: the speech in a recording found by its loudness, split at the
   silences between phrases (and, past `maxSeconds`, at the quietest moment), so each stretch can be translated and
   said again where it was. Plus the subtitles that come out of it. Pure functions, browser-safe. */

export type Segment = { start: number; end: number };
export type Cue = Segment & { text: string };

type Options = { maxSeconds?: number; minSilence?: number; minSpeech?: number; frame?: number; pad?: number };

/** Loudness per frame (RMS), every `frame` seconds. */
export function frameRms(x: Float32Array, rate: number, frame = 0.02): Float32Array {
  const n = Math.max(1, Math.round(rate * frame)), out = new Float32Array(Math.ceil(x.length / n));
  for (let f = 0; f < out.length; f++) {
    let s = 0, c = 0;
    for (let i = f * n, end = Math.min(x.length, i + n); i < end; i++) { s += x[i] * x[i]; c++; }
    out[f] = c ? Math.sqrt(s / c) : 0;
  }
  return out;
}

/** The spoken stretches of a recording, in seconds, in order, none longer than `maxSeconds`. */
export function splitSegments(x: Float32Array, rate: number, o: Options = {}): Segment[] {
  const { maxSeconds = 25, minSilence = 0.35, minSpeech = 0.25, frame = 0.02, pad = 0.12 } = o;
  const rms = frameRms(x, rate, frame);
  if (!rms.length) return [];
  // Speech is what stands clear of the quietest moment (the room's floor) and reaches a share of the loud speech
  // (a high percentile), whatever share of the recording is speech.
  const sorted = Float32Array.from(rms).sort();
  const floor = sorted[0], top = sorted[Math.floor(sorted.length * 0.95)];
  if (top < 0.005) return [];                                  // nothing louder than about -46 dBFS: no speech
  const thr = Math.min(top * 0.5, Math.max(floor * 3, top * 0.08, 0.003));
  const speech = Array.from(rms, v => v > thr);

  // runs of speech, joined across silences shorter than minSilence
  const gap = Math.round(minSilence / frame), runs: [number, number][] = [];
  let a = -1, quiet = 0;
  for (let f = 0; f <= speech.length; f++) {
    const on = f < speech.length && speech[f];
    if (on) { if (a < 0) a = f; quiet = 0; }
    else if (a >= 0 && (++quiet >= gap || f === speech.length)) { runs.push([a, f - quiet + 1]); a = -1; quiet = 0; }
  }

  const total = x.length / rate, maxF = Math.round(maxSeconds / frame), out: Segment[] = [];
  for (const [s, e] of runs) {
    // a run too long for one translation is cut at its quietest frame in the last third of each window
    let from = s;
    while (e - from > maxF) {
      const lo = from + Math.floor(maxF * 0.66), hi = from + maxF;
      let cut = hi, low = Infinity;
      for (let f = lo; f < hi; f++) if (rms[f] < low) { low = rms[f]; cut = f; }
      out.push({ start: from * frame, end: cut * frame });
      from = cut;
    }
    out.push({ start: from * frame, end: e * frame });
  }
  return out
    .filter(g => g.end - g.start >= minSpeech)
    .map((g, i, all) => ({
      start: Math.max(0, g.start - pad, i ? all[i - 1].end : 0),
      end: Math.min(total, g.end + pad, i < all.length - 1 ? all[i + 1].start : total),
    }))
    .map(g => ({ start: round(g.start), end: round(g.end) }));
}

const round = (s: number) => Math.round(s * 1000) / 1000;

/** Where each new clip goes on the track: at its segment's start, or straight after the previous clip if that one
    runs longer, so two never overlap. */
export function placeClips(segments: Segment[], durations: number[]): number[] {
  const starts: number[] = [];
  let end = 0;
  segments.forEach((g, i) => { const at = Math.max(g.start, end); starts.push(round(at)); end = at + (durations[i] ?? 0); });
  return starts;
}

const stamp = (s: number) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3_600_000), m = Math.floor(ms / 60_000) % 60, sec = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
};

/** SubRip subtitles, one cue per stretch; empty cues are left out. */
export function toSrt(cues: Cue[]): string {
  return cues.filter(c => c.text.trim()).map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text.trim()}\n`).join("\n");
}
