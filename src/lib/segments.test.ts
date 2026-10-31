import { describe, expect, it } from "vitest";
import { placeClips, splitSegments, toSrt } from "./segments";
import { fileName, titleFrom, versionLangs } from "./project-shape";

const RATE = 16000;
/** A recording: [seconds, loud?] pieces, speech as a tone with some noise under everything. */
function make(parts: [number, boolean][]): Float32Array {
  const total = parts.reduce((s, [d]) => s + d, 0), x = new Float32Array(Math.round(total * RATE));
  let i = 0, seed = 7;
  const noise = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647 - 0.5) * 0.004; };
  for (const [d, loud] of parts) {
    for (let k = 0, n = Math.round(d * RATE); k < n; k++, i++) x[i] = noise() + (loud ? 0.3 * Math.sin((2 * Math.PI * 180 * k) / RATE) : 0);
  }
  return x;
}

describe("splitSegments", () => {
  it("finds each phrase between silences", () => {
    const s = splitSegments(make([[0.5, false], [2, true], [1, false], [3, true], [0.8, false]]), RATE);
    expect(s).toHaveLength(2);
    expect(s[0].start).toBeCloseTo(0.38, 1);
    expect(s[0].end).toBeCloseTo(2.62, 1);
    expect(s[1].start).toBeCloseTo(3.38, 1);
    expect(s[1].end).toBeCloseTo(6.62, 1);
  });

  it("keeps a short breath inside one phrase", () => {
    const s = splitSegments(make([[0.4, false], [1.5, true], [0.15, false], [1.5, true], [0.4, false]]), RATE);
    expect(s).toHaveLength(1);
  });

  it("never returns a stretch longer than the limit, and never overlaps", () => {
    const s = splitSegments(make([[0.3, false], [70, true], [0.3, false]]), RATE, { maxSeconds: 25 });
    expect(s.length).toBeGreaterThanOrEqual(3);
    for (const g of s) expect(g.end - g.start).toBeLessThanOrEqual(25.3);
    for (let i = 1; i < s.length; i++) expect(s[i].start).toBeGreaterThanOrEqual(s[i - 1].end);
  });

  it("finds nothing in silence", () => {
    expect(splitSegments(make([[3, false]]), RATE)).toEqual([]);
  });
});

describe("placeClips", () => {
  it("puts each clip at its stretch, after the previous one if that runs long", () => {
    expect(placeClips([{ start: 1, end: 3 }, { start: 4, end: 6 }, { start: 6.5, end: 8 }], [2.5, 3, 1])).toEqual([1, 4, 7]);
  });
});

describe("toSrt", () => {
  it("writes numbered cues with SubRip times", () => {
    expect(toSrt([{ start: 0.5, end: 2.25, text: "Sannu" }, { start: 3, end: 4, text: " " }, { start: 3661.2, end: 3662, text: "Bonjour" }]))
      .toBe("1\n00:00:00,500 --> 00:00:02,250\nSannu\n\n2\n01:01:01,200 --> 01:01:02,000\nBonjour\n");
  });
});

describe("project shape", () => {
  it("titles a project from its first words", () => {
    expect(titleFrom("Dormez chaque nuit sous une moustiquaire imprégnée. Elle protège toute la famille.", 40)).toBe("Dormez chaque nuit sous une moustiquaire…");
    expect(titleFrom("  Court  ")).toBe("Court");
  });
  it("offers the local languages other than the source", () => {
    expect(versionLangs("fr")).toEqual(["ha", "dje", "ff", "tmh"]);
    expect(versionLangs("ha")).toEqual(["dje", "ff", "tmh"]);
  });
  it("makes safe file names", () => {
    expect(fileName("Réunion: samedi 9 h", "Hausa", "ogg")).toBe("Reunion-samedi-9-h-Hausa.ogg");
  });
});
