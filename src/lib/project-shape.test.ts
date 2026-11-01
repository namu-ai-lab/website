import { describe, expect, it } from "vitest";
import { cleanMessage, fileName, titleFrom } from "./project-shape";

describe("message shape", () => {
  it("titles a message from its first words", () => {
    expect(titleFrom("Dormez chaque nuit sous une moustiquaire imprégnée. Elle protège toute la famille.", 40)).toBe("Dormez chaque nuit sous une moustiquaire…");
    expect(titleFrom("  Court  ")).toBe("Court");
  });
  it("makes safe file names", () => {
    expect(fileName("Réunion: samedi 9 h", "Hausa", "ogg")).toBe("Reunion-samedi-9-h-Hausa.ogg");
  });
  it("keeps what a message needs and drops the rest", () => {
    expect(cleanMessage({ text: "  Sannu  ", lang: "ha", sourceLang: "fr", sourceText: "Bonjour", voice: "nadia", madeFor: "radio", extra: 1 }))
      .toEqual({ sourceLang: "fr", sourceText: "Bonjour", lang: "ha", text: "Sannu", voice: "nadia", madeFor: "radio" });
    expect(cleanMessage({ text: "Sannu", lang: "ha", sourceLang: "fr", madeFor: "fax" })?.madeFor).toBe("whatsapp");
    expect(cleanMessage({ text: "", lang: "ha", sourceLang: "fr" })).toBeNull();
    expect(cleanMessage({ text: "Sannu", lang: "xx", sourceLang: "fr" })).toBeNull();
  });
});
