import { describe, expect, it } from "vitest";
import { LANGUAGES, MODELS, VOICES, can, canTranslate, canTranslateText, defaultVoice, languagesFor, localFor, sampleOf, voicesFor } from "./index";
import { applyWords, fixLetters, hasStandIns } from "./text";
import { SCOPES } from "@/lib/key-shape";

describe("catalog", () => {
  const codes = new Set<string>(LANGUAGES.map(l => l.code));

  it("every model and voice names known languages", () => {
    for (const m of MODELS) for (const c of m.languages) expect(codes).toContain(c);
    for (const v of VOICES) for (const c of v.languages) expect(codes).toContain(c);
  });

  it("a model's task is its key scope, and every scope has a model", () => {
    expect(new Set(MODELS.map(m => m.task))).toEqual(new Set(SCOPES));
    for (const m of MODELS) expect(m.endpoint.startsWith("/v1/")).toBe(true);
  });

  it("every language the speech model speaks has a voice", () => {
    for (const c of languagesFor("speech")) expect(voicesFor(c).length).toBeGreaterThan(0);
  });

  it("answers what a task can do in a language", () => {
    expect(can("speech", "ha")).toBe(true);
    expect(can("speech", "dje")).toBe(true);
    expect(can("transcribe", "dje")).toBe(false);
    expect(can("converse", "dje")).toBe(false);
    expect(localFor("speech")).toEqual(["ha", "dje"]);
    expect(localFor("transcribe")).not.toContain("tmh");
    expect(canTranslate("fr", "ha")).toBe(true);
    expect(canTranslate("fr", "dje")).toBe(false);
    expect(canTranslate("ha", "ha")).toBe(true);
  });

  it("picks the organisation's voice when it fits the language", () => {
    expect(defaultVoice("ha")).toBe("nadia");
    expect(defaultVoice("ha", { ha: "nadia" })).toBe("nadia");
    expect(defaultVoice("ha", { ha: "fr" })).toBe("nadia");
    expect(defaultVoice("dje")).toBe("mouhamad");
    expect(defaultVoice("ha", { ha: "mouhamad" })).toBe("mouhamad");
    expect(defaultVoice("tmh")).toBeNull();
  });

  it("offers no withdrawn voice, and speaks French in the French voice", () => {
    expect(VOICES.map(v => v.id)).toEqual(["nadia", "fr", "mouhamad"]);
    expect(defaultVoice("ha", { ha: "salim" })).toBe("nadia");
    expect(can("speech", "fr")).toBe(true);
    expect(defaultVoice("fr")).toBe("fr");
    expect(canTranslate("fr", "ha")).toBe(true);
  });
});

describe("text", () => {
  it("fixes typed stand-ins for Hausa letters", () => {
    expect(fixLetters("k'auye da b'ata d'aya y'a'y'a", "ha")).toBe("ƙauye da ɓata ɗaya ƴa'ƴa");
    expect(hasStandIns("ƙauye", "ha")).toBe(false);
    expect(fixLetters("aujourd'hui", "fr")).toBe("aujourd'hui");
  });

  it("says listed words as written, whole words only", () => {
    const words = [{ term: "UNICEF", say: "Yunisef", lang: null }, { term: "CSI", say: "sé ès i", lang: "ha" as const }, { term: "CS", say: "x", lang: null }];
    expect(applyWords("Asibitin CSI da UNICEF.", words, "ha")).toBe("Asibitin sé ès i da Yunisef.");
    expect(applyWords("Le CSI et unicef", words, "fr")).toBe("Le CSI et Yunisef");
    expect(applyWords("UNICEFS", words, "ha")).toBe("UNICEFS");
  });
  it("types only what the API can translate as text", () => {
    expect(canTranslateText("ha", "fr")).toBe(true);    // said first in Nadia's voice, then translated
    expect(canTranslateText("fr", "ha")).toBe(true);    // said first in the French voice, until the API takes text
    expect(canTranslateText("ha", "ha")).toBe(true);
  });
});

describe("voices in several languages", () => {
  it("offers a voice under every language it speaks, Nadia first for Hausa", () => {
    expect(voicesFor("ha").map(v => v.id)).toEqual(["nadia", "mouhamad"]);
    expect(voicesFor("dje").map(v => v.id)).toEqual(["mouhamad"]);
  });

  it("has a sample in every language a voice speaks, and plays the one asked for", () => {
    for (const v of VOICES) for (const l of v.languages) expect(sampleOf(v, l).src).toMatch(/\.m4a$/);
    const m = VOICES.find(v => v.id === "mouhamad")!;
    expect(sampleOf(m, "ha").src).toBe("/voices/mouhamad/ha.m4a");
    expect(sampleOf(m, null).src).toBe("/voices/mouhamad/dje.m4a");
    expect(sampleOf(m, "fr").src).toBe("/voices/mouhamad/dje.m4a");   // a language it does not speak: its first
  });

  it("writes Zarma in Zarma: nothing translates into it yet", () => {
    expect(canTranslate("fr", "dje")).toBe(false);
    expect(canTranslateText("fr", "dje")).toBe(false);
    expect(canTranslateText("dje", "dje")).toBe(true);
  });
});
