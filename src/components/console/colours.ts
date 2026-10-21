import type { Scope } from "@/lib/key-shape";

/* One colour per model, from Namu's palette: flat for charts (MODEL_COLOUR), and as the small glass spheres of the home
   page's playground tabs wherever a model is named (MODEL_ORB): the same three tones, lit from the top left. */
export const MODEL_COLOUR: Record<Scope, string> = { speech: "#e8935a", transcribe: "#6b3e1e", translate: "#c9a27e", converse: "#1c1410" };

const TONES: Record<Scope, [string, string, string]> = {
  speech: ["#f29a5f", "#ffd8b8", "#b4552a"],
  transcribe: ["#c4865a", "#f6e6d6", "#5e3418"],
  translate: ["#8fa6d6", "#f4ece2", "#7a4325"],
  converse: ["#e8935a", "#7a4325", "#1c1410"],
};
export const MODEL_ORB = Object.fromEntries(Object.entries(TONES).map(([k, [c1, c2, c3]]) =>
  [k, `radial-gradient(circle at 34% 30%, ${c2} 0, ${c1} 48%, ${c3} 100%)`])) as Record<Scope, string>;
