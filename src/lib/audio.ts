/* Audio in the browser for the console Playground: any clip (a recording, an upload, a sample) becomes 16 kHz mono
   16-bit WAV, the format every Namu speech model reads, resampled properly by an OfflineAudioContext; and any clip
   can be summarised as peaks for a waveform. A clip also keeps its original bytes (`source`), which are far smaller
   than the WAV for anything compressed, so a long clip can still be sent. Client-only. */

export type Clip = { wav: Blob; source: Blob; seconds: number; peaks: number[]; name: string };

const RATE = 16000;

export function encodeWav(samples: Float32Array, rate: number): Blob {
  const b = new ArrayBuffer(44 + samples.length * 2), v = new DataView(b);
  const s = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  s(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); s(8, "WAVE"); s(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return new Blob([b], { type: "audio/wav" });
}

/** The loudest point in each of `n` slices, 0..1. */
export function peaksOf(data: Float32Array, n = 120): number[] {
  const out: number[] = [], step = Math.max(1, Math.floor(data.length / n));
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let j = i * step, end = Math.min(data.length, j + step); j < end; j++) m = Math.max(m, Math.abs(data[j]));
    out.push(m);
  }
  const top = Math.max(0.05, ...out);
  return out.map(x => x / top);
}

async function decode(blob: Blob): Promise<AudioBuffer> {
  const ctx = new AudioContext();
  try { return await ctx.decodeAudioData(await blob.arrayBuffer()); } finally { void ctx.close(); }
}

/** Any audio the browser can decode → 16 kHz mono WAV, its length and its waveform. */
export async function toClip(blob: Blob, name: string): Promise<Clip> {
  const src = await decode(blob);
  const frames = Math.max(1, Math.ceil(src.duration * RATE));
  const off = new OfflineAudioContext(1, frames, RATE);
  const node = off.createBufferSource();
  node.buffer = src; node.connect(off.destination); node.start();
  const mono = (await off.startRendering()).getChannelData(0);
  return { wav: encodeWav(mono, RATE), source: blob, seconds: src.duration, peaks: peaksOf(mono), name };
}

/** Peaks of audio that came back from the API (a WAV blob or base64). */
export async function peaksOfBlob(blob: Blob): Promise<number[]> {
  return peaksOf((await decode(blob)).getChannelData(0));
}
/** A sound's waveform outline and its length, read in one pass. */
export async function shapeOfBlob(blob: Blob): Promise<{ peaks: number[]; seconds: number }> {
  const b = await decode(blob);
  return { peaks: peaksOf(b.getChannelData(0)), seconds: b.duration };
}

export const b64ToBlob = (b64: string, type = "audio/wav") => new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type });

/* The microphone, recorded with MediaRecorder; `level` (0..1) follows the voice for a meter. Stops by itself at `maxS`.
   64 kbit/s is plenty for speech and keeps five minutes near 2.3 MB, under the Playground's upload limit (Chrome's
   default, 128 kbit/s, would make 4.4 MB). */
const RECORD_BPS = 64_000;
export class Recorder {
  level = 0;
  private stream?: MediaStream; private rec?: MediaRecorder; private chunks: Blob[] = [];
  private ctx?: AudioContext; private analyser?: AnalyserNode; private raf = 0; private timer = 0;
  private stopped = false;

  /** Opens the microphone and records. If stop() comes while the permission prompt is still open, the microphone is
      released as soon as it is granted and nothing is recorded. */
  async start(maxS: number, onAutoStop: () => void) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    if (this.stopped) { stream.getTracks().forEach(t => t.stop()); return; }
    this.stream = stream;
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize = 1024;
    this.ctx.createMediaStreamSource(this.stream).connect(this.analyser);
    const buf = new Float32Array(this.analyser.fftSize);
    const tick = () => {
      this.analyser!.getFloatTimeDomainData(buf);
      let s = 0; for (const v of buf) s += v * v;
      this.level = Math.min(1, Math.sqrt(s / buf.length) * 5);
      this.raf = requestAnimationFrame(tick);
    };
    tick();
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream, { audioBitsPerSecond: RECORD_BPS });
    this.rec.ondataavailable = e => { if (e.data.size) this.chunks.push(e.data); };
    this.rec.start();
    this.timer = window.setTimeout(onAutoStop, maxS * 1000);
  }

  /** Safe at any point, including while start() is still waiting for the microphone. */
  stop(): Promise<Blob> {
    this.stopped = true;
    clearTimeout(this.timer); cancelAnimationFrame(this.raf); this.level = 0;
    return new Promise(resolve => {
      const done = () => {
        this.stream?.getTracks().forEach(t => t.stop()); void this.ctx?.close();
        resolve(new Blob(this.chunks, { type: this.rec?.mimeType || "audio/webm" }));
      };
      if (!this.rec || this.rec.state === "inactive") return done();
      this.rec.onstop = done; this.rec.stop();
    });
  }
}
