import { describe, expect, it } from "vitest";
import { BLANK_STEPS, TEMPLATES } from "@/content/agent-templates";
import { layout } from "./workflow-layout";

describe("workflow layout", () => {
  it("puts each step on the row of its distance from the start, branches side by side", () => {
    const health = TEMPLATES.find(t => t.id === "health-line")!;
    const { nodes, links } = layout(health.steps);
    const row = Object.fromEntries(nodes.map(n => [n.id, n.row]));
    expect(row).toEqual({ start: 0, ask: 1, answer: 2, refer: 2, end: 3 });
    const [a, r] = [nodes.find(n => n.id === "answer")!, nodes.find(n => n.id === "refer")!];
    expect(a.y).toBe(r.y);
    expect(a.x).toBeLessThan(r.x);
    expect(links.filter(l => l.label)).toHaveLength(2);
    expect(links.every(l => !l.back)).toBe(true);
  });

  it("draws a loop back up round the side", () => {
    const fr = TEMPLATES.find(t => t.id === "french-practice")!;
    const back = layout(fr.steps).links.filter(l => l.back);
    expect(back).toHaveLength(1);
    expect(back[0]).toMatchObject({ from: "correct", to: "say" });
  });

  it("lays out every template and the blank agent", () => {
    for (const steps of [...TEMPLATES.map(t => t.steps), BLANK_STEPS]) {
      const l = layout(steps);
      expect(l.nodes).toHaveLength(steps.length);
      expect(l.width).toBeGreaterThan(0);
      for (const s of steps) for (const n of s.next) expect(steps.some(x => x.id === n.to)).toBe(true);
    }
  });
});
