import type { Scope } from "@/lib/key-shape";

/* One colour per model, from Namu's palette, wherever a model appears in the console (charts, logs, the Playground). */
export const MODEL_COLOUR: Record<Scope, string> = { speech: "#e8935a", transcribe: "#6b3e1e", translate: "#c9a27e", converse: "#1c1410" };
