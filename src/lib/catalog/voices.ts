/* The voices the platform offers: one entry each, as the gateway's VOICES dict has them ("warm" is the gateway's alias
   of nadia, so it is not listed twice). Every picker (Speak, projects, agents, the API's Voices page) reads this list,
   and a new voice is one entry here plus one in the gateway. Consent for each voice is on file with the founder.
   Browser-safe.

   uses     what the voice suits, for the library's filters (keys of USES)
   sample   a recording of the voice, made through the API */
import type { LangCode } from "./languages";

export const USES = ["health", "education", "radio", "stories", "public", "business"] as const;
export type Use = (typeof USES)[number];

export type Voice = {
  id: string;
  name: string;
  languages: readonly LangCode[];
  gender?: "female" | "male";
  uses: readonly Use[];
  sample: string;
  /** the persona the conversation model knows this voice by, when it has one */
  persona?: string;
};

export const VOICES = [
  { id: "nadia", name: "Nadia", languages: ["ha"], gender: "female", uses: ["health", "education", "public", "stories"], sample: "/converse/nadia/hello.m4a", persona: "nadia" },
  { id: "salim", name: "Salim", languages: ["ha"], gender: "male", uses: ["radio", "stories", "business", "public"], sample: "/converse/salim/hello.m4a", persona: "salim" },
  { id: "fr", name: "Français", languages: ["fr"], uses: ["public", "education", "business"], sample: "/usecases/translation-fr-story.m4a" },
] as const satisfies readonly Voice[];

export type VoiceId = (typeof VOICES)[number]["id"];

const BY_ID = new Map<string, Voice>(VOICES.map(v => [v.id, v]));
export const isVoiceId = (x: unknown): x is VoiceId => typeof x === "string" && BY_ID.has(x);
export const voice = (id: VoiceId): Voice => BY_ID.get(id)!;
export const voicesFor = (lang: LangCode): Voice[] => VOICES.filter(v => (v.languages as readonly string[]).includes(lang));
