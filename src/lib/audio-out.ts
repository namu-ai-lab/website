/* A recording made ready for where it will be heard (lib/catalog/outputs): resampled, brought to the target's
   loudness, and wrapped in the file that channel accepts. A WhatsApp voice note is Ogg Opus: encoded with the
   browser's own Opus encoder (WebCodecs) and put in an Ogg file here; a browser without it gets the WAV. The gateway
   answers WAV, so everything starts from there. Client-only. */
import { encodeWav } from "./audio";
import { output, type OutputId } from "./catalog/outputs";

export type Rendered = { blob: Blob; ext: string; type: string };

async function decode(blob: Blob): Promise<AudioBuffer> {
  const ctx = new AudioContext();
  try { return await ctx.decodeAudioData(await blob.arrayBuffer()); } finally { void ctx.close(); }
}

/** Mono at `rate`, resampled properly by an OfflineAudioContext. */
async function mono(src: AudioBuffer, rate: number): Promise<Float32Array> {
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(src.duration * rate)), rate);
  const node = off.createBufferSource();
  node.buffer = src; node.connect(off.destination); node.start();
  return (await off.startRendering()).getChannelData(0);
}

/** Scales the samples towards a loudness, measured as RMS over the parts that are not silence (a fair stand-in for
    LUFS on speech), never past a peak of -1 dBFS. */
export function normalise(x: Float32Array, lufs: number): Float32Array {
  let sum = 0, n = 0, peak = 0;
  for (const v of x) { const a = Math.abs(v); if (a > peak) peak = a; if (a > 0.003) { sum += v * v; n++; } }
  if (!n || !peak) return x;
  const rmsDb = 10 * Math.log10(sum / n);
  const gain = Math.min(10 ** ((lufs - rmsDb) / 20), 0.891 / peak);       // 0.891 ≈ -1 dBFS
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] * gain;
  return out;
}

export async function render(wav: Blob, target: OutputId): Promise<Rendered> {
  const o = output(target);
  if (o.rate === null && o.lufs === null) return { blob: wav, ext: "wav", type: "audio/wav" };
  const src = await decode(wav);
  const rate = o.rate ?? src.sampleRate;
  let pcm = await mono(src, rate);
  if (o.lufs !== null) pcm = normalise(pcm, o.lufs);
  if (o.container === "ogg") {
    const ogg = await oggOpus(pcm, rate).catch(() => null);
    if (ogg) return { blob: ogg, ext: "ogg", type: "audio/ogg" };
  }
  return { blob: encodeWav(pcm, rate), ext: "wav", type: "audio/wav" };
}

/* ---------------------------------------------------------------- Ogg Opus (RFC 7845) from WebCodecs packets */

type Enc = { configure(c: object): void; encode(d: unknown): void; flush(): Promise<void>; close(): void };
type EncCtor = { new(i: { output: (c: { byteLength: number; copyTo(b: Uint8Array): void; duration?: number | null }) => void; error: (e: unknown) => void }): Enc; isConfigSupported(c: object): Promise<{ supported?: boolean }> };
type DataCtor = new (i: { format: "f32"; sampleRate: number; numberOfFrames: number; numberOfChannels: number; timestamp: number; data: Float32Array }) => unknown;

async function oggOpus(pcm: Float32Array, rate: number): Promise<Blob | null> {
  const w = globalThis as unknown as { AudioEncoder?: EncCtor; AudioData?: DataCtor };
  if (!w.AudioEncoder || !w.AudioData) return null;
  const config = { codec: "opus", sampleRate: rate, numberOfChannels: 1, bitrate: 32_000 };
  if (!(await w.AudioEncoder.isConfigSupported(config)).supported) return null;
  const packets: { data: Uint8Array; frames: number }[] = [];
  let failed = false;
  const enc = new w.AudioEncoder({
    output: c => { const d = new Uint8Array(c.byteLength); c.copyTo(d); packets.push({ data: d, frames: Math.round(((c.duration ?? 20_000) / 1e6) * 48000) }); },
    error: () => { failed = true; },
  });
  enc.configure(config);
  const step = rate;   // one second at a time
  for (let i = 0; i < pcm.length; i += step) {
    const part = pcm.subarray(i, Math.min(pcm.length, i + step));
    enc.encode(new w.AudioData({ format: "f32", sampleRate: rate, numberOfFrames: part.length, numberOfChannels: 1, timestamp: Math.round((i / rate) * 1e6), data: part }));
  }
  await enc.flush(); enc.close();
  if (failed || !packets.length) return null;
  return muxOgg(packets, rate, Math.round((pcm.length / rate) * 48000));
}

const PRE_SKIP = 312;   // the encoder's look-ahead at 48 kHz, as libopus reports it

/** Ogg pages for an Opus stream: the identification and comment headers, then the audio packets. */
export function muxOgg(packets: { data: Uint8Array; frames: number }[], inputRate: number, totalFrames48k: number): Blob {
  const serial = (Math.random() * 0xffffffff) >>> 0;
  const head = new Uint8Array(19), hv = new DataView(head.buffer);
  head.set([..."OpusHead"].map(c => c.charCodeAt(0)));
  head[8] = 1; head[9] = 1; hv.setUint16(10, PRE_SKIP, true); hv.setUint32(12, inputRate, true); hv.setInt16(16, 0, true); head[18] = 0;
  const vendor = new TextEncoder().encode("Namu");
  const tags = new Uint8Array(8 + 4 + vendor.length + 4), tv = new DataView(tags.buffer);
  tags.set([..."OpusTags"].map(c => c.charCodeAt(0))); tv.setUint32(8, vendor.length, true); tags.set(vendor, 12); tv.setUint32(12 + vendor.length, 0, true);

  const pages: Uint8Array[] = [];
  let seq = 0;
  pages.push(page(serial, seq++, 0x02, 0n, [head]));
  pages.push(page(serial, seq++, 0x00, 0n, [tags]));
  let granule = 0n, batch: Uint8Array[] = [], segs = 0;
  const end = BigInt(totalFrames48k + PRE_SKIP);
  packets.forEach((p, i) => {
    const need = Math.floor(p.data.length / 255) + 1;
    if (segs + need > 255) { pages.push(page(serial, seq++, 0x00, granule, batch)); batch = []; segs = 0; }
    batch.push(p.data); segs += need; granule += BigInt(p.frames);
    if (i === packets.length - 1) pages.push(page(serial, seq++, 0x04, granule < end ? granule : end, batch));
  });
  return new Blob(pages as BlobPart[], { type: "audio/ogg" });
}

function page(serial: number, seq: number, flags: number, granule: bigint, packets: Uint8Array[]): Uint8Array {
  const lacing: number[] = [];
  for (const p of packets) { let n = p.length; while (n >= 255) { lacing.push(255); n -= 255; } lacing.push(n); }
  const body = packets.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(27 + lacing.length + body), v = new DataView(out.buffer);
  out.set([0x4f, 0x67, 0x67, 0x53]); out[4] = 0; out[5] = flags;
  v.setBigUint64(6, granule, true); v.setUint32(14, serial, true); v.setUint32(18, seq, true); v.setUint32(22, 0, true);
  out[26] = lacing.length; out.set(lacing, 27);
  let o = 27 + lacing.length;
  for (const p of packets) { out.set(p, o); o += p.length; }
  v.setUint32(22, oggCrc(out), true);
  return out;
}

const OGG_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) { let r = i << 24; for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1; t[i] = r >>> 0; }
  return t;
})();
export function oggCrc(b: Uint8Array): number {
  let c = 0;
  for (const x of b) c = ((c << 8) ^ OGG_TABLE[((c >>> 24) ^ x) & 0xff]) >>> 0;
  return c >>> 0;
}
