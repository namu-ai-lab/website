/* The voices the platform offers: one entry each, as the gateway's VOICES dict has them ("warm" is the gateway's alias
   of nadia, so it is not listed twice). Every picker (Speak, projects, agents, the API's Voices page) reads this list,
   and a new voice is one entry here plus one in the gateway, with its consent on file. Withdrawn on 2026-10-31 (see
   lib/voices): salim, a cloned Hausa voice. fr, the French reference voice, was withdrawn with it and is back since
   2026-11-01, when the founder confirmed its consent. Browser-safe.

   uses     what the voice suits, for the library's filters (keys of USES)
   sample   a recording of the voice, made through the API
   outline  that recording's waveform, 40 peaks from 0 to 100 (ffmpeg, mono 16 kHz), to draw the voice by its own sound */
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
  outline: readonly number[];
  /** the persona the conversation model knows this voice by, when it has one */
  persona?: string;
};

export const VOICES = [
  { id: "nadia", name: "Nadia", languages: ["ha"], gender: "female", uses: ["health", "education", "public", "stories"], sample: "/converse/nadia/hello.m4a", persona: "nadia",
    outline: [3, 87, 47, 96, 100, 32, 59, 99, 83, 63, 55, 14, 0, 36, 89, 85, 89, 90, 60, 84, 76, 67, 56, 80, 31, 44, 0, 0, 48, 82, 89, 87, 77, 71, 55, 34, 60, 24, 3, 0] },
  { id: "fr", name: "Français", languages: ["fr"], uses: ["public", "education", "business"], sample: "/usecases/translation-fr-story.m4a",
    outline: [0, 0, 9, 0, 0, 10, 73, 48, 29, 27, 43, 42, 10, 60, 93, 66, 70, 42, 54, 75, 68, 25, 23, 45, 49, 29, 73, 70, 17, 60, 61, 95, 100, 39, 63, 46, 34, 25, 1, 0] },
] as const satisfies readonly Voice[];

export type VoiceId = (typeof VOICES)[number]["id"];

const BY_ID = new Map<string, Voice>(VOICES.map(v => [v.id, v]));
export const isVoiceId = (x: unknown): x is VoiceId => typeof x === "string" && BY_ID.has(x);
export const voice = (id: VoiceId): Voice => BY_ID.get(id)!;
export const voicesFor = (lang: LangCode): Voice[] => VOICES.filter(v => (v.languages as readonly string[]).includes(lang));
