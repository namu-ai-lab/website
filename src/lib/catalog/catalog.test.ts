import { describe, expect, it } from "vitest";
import { LANGUAGES, MODELS, VOICES, can, canTranslate, defaultVoice, languagesFor, stateOf, voicesFor } from "./index";
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
    expect(can("speech", "dje")).toBe(false);
    expect(stateOf("ha")).toBe("ready");
    expect(stateOf("tmh")).toBe("soon");
    expect(canTranslate("fr", "ha")).toBe(true);
    expect(canTranslate("fr", "dje")).toBe(false);
    expect(canTranslate("ha", "ha")).toBe(true);
  });

  it("picks the organisation's voice when it fits the language", () => {
    expect(defaultVoice("ha")).toBe("nadia");
    expect(defaultVoice("ha", { ha: "nadia" })).toBe("nadia");
    expect(defaultVoice("ha", { ha: "fr" })).toBe("nadia");
    expect(defaultVoice("dje")).toBeNull();
  });

  it("offers no withdrawn voice, and French is text only", () => {
    expect(VOICES.map(v => v.id)).toEqual(["nadia"]);
    expect(defaultVoice("ha", { ha: "salim" })).toBe("nadia");
    expect(can("speech", "fr")).toBe(false);
    expect(defaultVoice("fr")).toBeNull();
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
});
