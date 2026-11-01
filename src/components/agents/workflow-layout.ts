/* Where each step of an agent's workflow sits, top to bottom, as ElevenAgents draws a template's preview: each step's
   row is its distance from the start, the steps of a row are centred side by side, and each link is a curve from the
   bottom of one step to the top of the next. A link back up (a loop, as "again" in French practice) goes round the
   right-hand side. Pure: no React, so it is tested on its own. */
import type { Step } from "@/content/agent-templates";

export const BOX = { w: 196, h: 46, gapX: 40, gapY: 92, pad: 28 } as const;

export type Placed = { id: string; kind: Step["kind"]; x: number; y: number; row: number };
export type Link = { from: string; to: string; d: string; back: boolean; label?: Step["next"][number]["when"]; lx: number; ly: number };

export function layout(steps: readonly Step[]): { nodes: Placed[]; links: Link[]; width: number; height: number } {
  if (!steps.length) return { nodes: [], links: [], width: 0, height: 0 };
  const byId = new Map(steps.map(s => [s.id, s]));
  const row = new Map<string, number>([[steps[0].id, 0]]);
  const queue = [steps[0].id];
  while (queue.length) {
    const id = queue.shift()!;
    for (const n of byId.get(id)?.next ?? []) if (byId.has(n.to) && !row.has(n.to)) { row.set(n.to, row.get(id)! + 1); queue.push(n.to); }
  }
  let last = Math.max(...row.values());
  for (const s of steps) if (!row.has(s.id)) row.set(s.id, ++last);        // unreachable steps go at the bottom
  const rows: string[][] = [];
  for (const s of steps) (rows[row.get(s.id)!] ??= []).push(s.id);
  const widest = Math.max(...rows.map(r => r.length));
  const width = BOX.pad * 2 + widest * BOX.w + (widest - 1) * BOX.gapX + 60;   // room on the right for loops
  const centre = (width - 60) / 2;
  const nodes: Placed[] = [];
  rows.forEach((ids, r) => {
    const span = ids.length * BOX.w + (ids.length - 1) * BOX.gapX;
    ids.forEach((id, i) => nodes.push({ id, kind: byId.get(id)!.kind, row: r, x: centre - span / 2 + i * (BOX.w + BOX.gapX), y: BOX.pad + r * (BOX.h + BOX.gapY) }));
  });
  const at = new Map(nodes.map(n => [n.id, n]));
  const links: Link[] = [];
  for (const s of steps) for (const n of s.next) {
    const a = at.get(s.id), b = at.get(n.to);
    if (!a || !b) continue;
    const back = b.row <= a.row;
    if (!back) {
      const x1 = a.x + BOX.w / 2, y1 = a.y + BOX.h, x2 = b.x + BOX.w / 2, y2 = b.y, my = (y1 + y2) / 2;
      links.push({ from: s.id, to: n.to, back, label: n.when, d: `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`, lx: (x1 + x2) / 2, ly: my });
    } else {
      const x1 = a.x + BOX.w, y1 = a.y + BOX.h / 2, x2 = b.x + BOX.w, y2 = b.y + BOX.h / 2, out = Math.max(x1, x2) + 46;
      links.push({ from: s.id, to: n.to, back, label: n.when, d: `M${x1},${y1} C${out},${y1} ${out},${y2} ${x2},${y2}`, lx: out - 12, ly: (y1 + y2) / 2 });
    }
  }
  const height = BOX.pad * 2 + rows.length * BOX.h + (rows.length - 1) * BOX.gapY;
  return { nodes, links, width, height };
}
