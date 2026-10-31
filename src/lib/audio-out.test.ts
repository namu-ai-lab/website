import { describe, expect, it } from "vitest";
import { muxOgg, normalise, oggCrc } from "./audio-out";
import { crc32, zip } from "./zip";

const bytes = (s: string) => new TextEncoder().encode(s);

describe("checksums", () => {
  it("Ogg's CRC (poly 0x04c11db7, no reflection) and zip's CRC-32 match their check values", () => {
    expect(oggCrc(bytes("123456789"))).toBe(0x89a1897f);
    expect(crc32(bytes("123456789"))).toBe(0xcbf43926);
  });
});

describe("Ogg Opus", () => {
  it("writes the two headers, then audio pages, each a valid OggS page", async () => {
    // 300 frames of input; an encoder emits one packet more, to cover its look-ahead (the pre-skip)
    const packets = Array.from({ length: 301 }, (_, i) => ({ data: new Uint8Array(40 + (i % 7)), frames: 960 }));
    const buf = new Uint8Array(await muxOgg(packets, 48000, 300 * 960).arrayBuffer());
    const pages: { flags: number; granule: bigint; seq: number }[] = [];
    let o = 0;
    while (o < buf.length) {
      expect(String.fromCharCode(...buf.slice(o, o + 4))).toBe("OggS");
      const v = new DataView(buf.buffer, o), segs = buf[o + 26];
      const body = buf.slice(o + 27, o + 27 + segs).reduce((s, x) => s + x, 0);
      const len = 27 + segs + body, page = buf.slice(o, o + len), crc = v.getUint32(22, true);
      page.set([0, 0, 0, 0], 22);
      expect(oggCrc(page)).toBe(crc);
      pages.push({ flags: buf[o + 5], granule: v.getBigUint64(6, true), seq: v.getUint32(18, true) });
      o += len;
    }
    expect(String.fromCharCode(...buf.slice(28, 36))).toBe("OpusHead");
    expect(pages[0].flags).toBe(0x02);
    expect(pages.at(-1)!.flags).toBe(0x04);
    expect(pages.map(p => p.seq)).toEqual(pages.map((_, i) => i));
    expect(pages.at(-1)!.granule).toBe(BigInt(300 * 960 + 312));
  });
});

describe("loudness", () => {
  it("brings speech towards the target without clipping", () => {
    const x = Float32Array.from({ length: 48000 }, (_, i) => 0.05 * Math.sin(i / 10));
    const y = normalise(x, -16);
    const rms = Math.sqrt(y.reduce((s, v) => s + v * v, 0) / y.length);
    expect(20 * Math.log10(rms)).toBeGreaterThan(-17.5);
    expect(Math.max(...y.map(Math.abs))).toBeLessThanOrEqual(0.892);
  });
});

describe("zip", () => {
  it("stores files with a central directory", async () => {
    const b = new Uint8Array(await zip([{ name: "ha.ogg", data: bytes("abc") }, { name: "fr.wav", data: bytes("de") }]).arrayBuffer());
    const v = new DataView(b.buffer);
    expect(v.getUint32(0, true)).toBe(0x04034b50);
    const end = b.length - 22;
    expect(v.getUint32(end, true)).toBe(0x06054b50);
    expect(v.getUint16(end + 10, true)).toBe(2);
  });
});
