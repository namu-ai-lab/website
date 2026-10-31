import type { Step } from "@/content/agent-templates";
import type { Lang } from "@/i18n/config";
import { BOX, layout } from "./workflow-layout";

/* An agent's steps drawn as ElevenAgents previews a template: boxes on a dotted canvas, linked by curves, the
   condition of a branch on its link. Read-only. */
export function Workflow({ steps, lang, title }: { steps: readonly Step[]; lang: Lang; title: string }) {
  const { nodes, links, width, height } = layout(steps);
  const label = new Map(steps.map(s => [s.id, s.label[lang]]));
  return (
    <div className="ag-flow">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} style={{ maxWidth: width }}>
        <defs>
          <marker id="ag-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" className="ag-flow-head" />
          </marker>
        </defs>
        {links.map((l, i) => <path key={i} d={l.d} className={`ag-flow-link${l.back ? " back" : ""}`} markerEnd="url(#ag-arrow)" />)}
        {nodes.map(n => (
          <g key={n.id} transform={`translate(${n.x},${n.y})`} className={`ag-flow-node ${n.kind}`}>
            <rect width={BOX.w} height={BOX.h} rx={n.kind === "step" ? 12 : BOX.h / 2} />
            <text x={BOX.w / 2} y={BOX.h / 2} dominantBaseline="central" textAnchor="middle">{label.get(n.id)}</text>
          </g>
        ))}
        {links.filter(l => l.label).map((l, i) => {
          const text = l.label![lang], w = Math.max(48, text.length * 6.6 + 18);
          return (
            <g key={`l${i}`} transform={`translate(${l.lx - w / 2},${l.ly - 11})`} className="ag-flow-when">
              <rect width={w} height={22} rx={11} />
              <text x={w / 2} y={11} dominantBaseline="central" textAnchor="middle">{text}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
