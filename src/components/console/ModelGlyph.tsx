import { Icon } from "../Icon";
import { MODEL_COLOUR } from "./colours";
import { MODELS } from "@/lib/catalog";
import { SCOPES, type Scope } from "@/lib/key-shape";

/** A model where it is named: its own icon (the catalog's), in its chart colour. An agent's turn counts under Aïr, as
    in Usage and Logs; anything else that is not a model shows nothing. */
export function ModelGlyph({ scope, size = 15 }: { scope: string; size?: number }) {
  const task = (scope === "agents" ? "converse" : scope) as Scope;
  const m = (SCOPES as readonly string[]).includes(task) ? MODELS.find(x => x.task === task) : undefined;
  if (!m) return null;
  return <span className="cx-glyph" style={{ color: MODEL_COLOUR[task] }} aria-hidden="true"><Icon name={m.icon} size={size} stroke={1.6} /></span>;
}
