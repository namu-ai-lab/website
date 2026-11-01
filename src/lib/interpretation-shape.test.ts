import { describe, expect, it } from "vitest";
import { PEAKS, cleanTurn, isUuid, readPrint, readTurn } from "./interpretation-shape";

const id = "0b9c6f1e-3d2a-4c5b-8e7f-1a2b3c4d5e6f";
const turn = { id, from: "ha", heard: " Sannu ", to: "fr", text: " Bonjour ", voice: null, seconds: 3.14159, peaks: [0, 50.4, 120, -3, "x"] };

describe("cleanTurn", () => {
  it("keeps a turn Kora translates, trimmed and bounded", () => {
    expect(cleanTurn(turn)).toEqual({ id, from: "ha", heard: "Sannu", to: "fr", text: "Bonjour", voice: null, seconds: 3.1, peaks: [0, 50, 100, 0, 0] });
  });
  it("refuses a turn without words, an id, or a pair Namu translates", () => {
    expect(cleanTurn({ ...turn, text: "  " })).toBeNull();
    expect(cleanTurn({ ...turn, id: "1" })).toBeNull();
    expect(cleanTurn({ ...turn, to: "ha" })).toBeNull();
    expect(cleanTurn({ ...turn, from: "dje" })).toBeNull();
  });
  it("keeps a voice only where it speaks the translation's language", () => {
    expect(cleanTurn({ ...turn, from: "fr", to: "ha", voice: "nadia" })?.voice).toBe("nadia");
    expect(cleanTurn({ ...turn, voice: "nadia" })?.voice).toBeNull();     // Nadia does not speak French
    expect(cleanTurn({ ...turn, from: "fr", to: "ha", voice: "salim" })?.voice).toBeNull();   // withdrawn
  });
  it("keeps at most PEAKS points of the outline", () => {
    expect(cleanTurn({ ...turn, peaks: Array(100).fill(10) })?.peaks).toHaveLength(PEAKS);
  });
});

describe("readTurn", () => {
  it("reads a stored turn back, and skips what is damaged", () => {
    expect(readTurn({ ...turn, at: "2026-11-01T10:00:00.000Z" })?.text).toBe("Bonjour");
    expect(readTurn({ ...turn })).toBeNull();
    expect(readTurn("nothing")).toBeNull();
  });
});

it("knows an id", () => {
  expect(isUuid(id)).toBe(true);
  expect(isUuid("../x")).toBe(false);
});

describe("readPrint", () => {
  it("draws a turn from who spoke, how long and the outline, with no words", () => {
    expect(readPrint({ from: "fr", seconds: 2.5, peaks: [10, 200, "x"], heard: "Bonjour" })).toEqual({ from: "fr", seconds: 2.5, peaks: [10, 100, 0] });
    expect(readPrint({ from: "xx", seconds: 1, peaks: [] })).toBeNull();
  });
});
