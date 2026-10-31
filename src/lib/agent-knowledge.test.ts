import { describe, expect, it } from "vitest";
import { MAX_MESSAGE_CHARS, contextMessage, passages, retrieve, words } from "./agent-knowledge";
import { cleanPatch, parseExpect, passes } from "./agent-shape";

const guide = `Le paludisme se transmet par la piqûre du moustique.

Dormir sous une moustiquaire imprégnée protège toute la famille. Les moustiquaires sont distribuées au CSI.

La vaccination des enfants est gratuite au CSI le mardi et le jeudi.`;

describe("knowledge", () => {
  it("keeps words that carry meaning, without accents or case", () => {
    expect(words("Où est le CSI ? Moustiquaire imprégnée")).toEqual(["csi", "moustiquaire", "impregnee"]);
  });

  it("cuts documents into passages at paragraphs, then sentences", () => {
    expect(passages(guide)).toHaveLength(3);
    const long = Array.from({ length: 40 }, (_, i) => `Phrase numéro ${i} sur les semences.`).join(" ");
    const ps = passages(long, 200);
    expect(ps.length).toBeGreaterThan(4);
    for (const p of ps) expect(p.length).toBeLessThanOrEqual(300);
  });

  it("finds the passage that answers, best first, within the budget", () => {
    const docs = [{ name: "Guide santé", body: guide }, { name: "Autre", body: "Le marché ouvre le lundi." }];
    const found = retrieve(docs, "Quand est la vaccination des enfants ?", 2000);
    expect(found[0].text).toContain("vaccination");
    expect(retrieve(docs, "vaccination moustiquaire", 90).every(f => f.text.length <= 90)).toBe(true);
    expect(retrieve(docs, "bonjour", 2000)).toEqual([]);
  });

  it("builds a labelled context message inside the service's limit", () => {
    const m = contextMessage({ name: "Ligne santé", instructions: "Orientez vers le CSI.", docs: [{ name: "Guide", body: guide.repeat(40) }], query: "moustiquaire", languages: ["Hausa"] });
    expect(m.startsWith("[Context from the organisation")).toBe(true);
    expect(m).toContain("Orientez vers le CSI.");
    expect(m).toContain("moustiquaire");
    expect(m.length).toBeLessThanOrEqual(MAX_MESSAGE_CHARS);
  });
});

describe("agent shape", () => {
  it("cleans a patch and refuses an empty name or no language", () => {
    expect(cleanPatch({ name: "  Ligne  ", languages: ["ha", "xx", "ha"], voice: "nadia", extra: 1 })).toEqual({ name: "Ligne", languages: ["ha"], voice: "nadia" });
    expect(cleanPatch({ name: " " })).toBeNull();
    expect(cleanPatch({ languages: [] })).toBeNull();
    expect(cleanPatch({ channels: { whatsapp: { phoneNumberId: "1234 5678" } } })).toEqual({ channels: { whatsapp: { phoneNumberId: "12345678" } } });
    expect(cleanPatch({ checks: [{ kind: "goal", text: " Oriente vers le CSI " }, { kind: "x", text: "no" }] })).toEqual({ checks: [{ kind: "goal", text: "Oriente vers le CSI" }] });
  });

  it("passes a reply that holds every expected word, accents and case aside", () => {
    expect(passes("Ku je CSI mafi kusa.", ["csi"])).toBe(true);
    expect(passes("Allez à l’hôpital", ["hopital", "CSI"])).toBe(false);
    expect(parseExpect(" CSI, agent de santé ,, ")).toEqual(["CSI", "agent de santé"]);
  });
});
