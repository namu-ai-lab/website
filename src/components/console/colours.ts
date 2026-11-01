import type { Scope } from "@/lib/key-shape";

/* One colour per model, from Namu's palette, flat: for charts, and for the model's own icon wherever it is named
   (ModelGlyph). */
export const MODEL_COLOUR: Record<Scope, string> = { speech: "#e8935a", transcribe: "#6b3e1e", translate: "#c9a27e", converse: "#1c1410" };
