/* The voices the platform offers: one entry each, as the gateway's VOICES dict has them ("warm" is the gateway's alias
   of nadia, so it is not listed twice). Every picker (Speak, projects, agents, the API's Voices page) reads this list,
   and a new voice is one entry here plus one in the gateway, with its consent on file. Withdrawn on 2026-10-31 (see
   lib/voices): salim, a cloned Hausa voice. fr, the French reference voice, was withdrawn with it and is back since
   2026-11-01, when the founder confirmed its consent. mouhamad is the founder's own voice (his consent, 2026-11-01),
   in Zarma and Hausa. Browser-safe.

   A voice is a person, and may speak several languages (as an ElevenLabs voice does): the first is the one it speaks
   when nothing else is asked, and a picker for a language offers every voice that speaks it.

   uses      what the voice suits, for the library's filters (keys of USES)
   samples   what it sounds like in each language it speaks: a recording made through the API, and its outline, 40 peaks
             from 0 to 100 (ffmpeg, mono 16 kHz), to draw the voice by its own sound */
import type { LangCode } from "./languages";

export const USES = ["health", "education", "radio", "stories", "public", "business"] as const;
export type Use = (typeof USES)[number];

export type Sample = { src: string; outline: readonly number[] };

export type Voice = {
  id: string;
  name: string;
  languages: readonly LangCode[];
  gender?: "female" | "male";
  uses: readonly Use[];
  samples: Partial<Record<LangCode, Sample>>;
  /** the persona the conversation model knows this voice by, when it has one */
  persona?: string;
};

export const VOICES = [
  { id: "nadia", name: "Nadia", languages: ["ha"], gender: "female", uses: ["health", "education", "public", "stories"], persona: "nadia",
    samples: { ha: { src: "/converse/nadia/hello.m4a", outline: [3, 87, 47, 96, 100, 32, 59, 99, 83, 63, 55, 14, 0, 36, 89, 85, 89, 90, 60, 84, 76, 67, 56, 80, 31, 44, 0, 0, 48, 82, 89, 87, 77, 71, 55, 34, 60, 24, 3, 0] } } },
  { id: "fr", name: "Français", languages: ["fr"], uses: ["public", "education", "business"],
    samples: { fr: { src: "/usecases/translation-fr-story.m4a", outline: [0, 0, 9, 0, 0, 10, 73, 48, 29, 27, 43, 42, 10, 60, 93, 66, 70, 42, 54, 75, 68, 25, 23, 45, 49, 29, 73, 70, 17, 60, 61, 95, 100, 39, 63, 46, 34, 25, 1, 0] } } },
  { id: "mouhamad", name: "Mouhamad", languages: ["dje", "ha"], gender: "male", uses: ["public", "education", "radio", "stories"],
    samples: {
      dje: { src: "/voices/mouhamad/dje.m4a", outline: [99, 100, 73, 74, 65, 11, 2, 1, 10, 66, 66, 52, 51, 41, 44, 37, 23, 16, 60, 58, 47, 36, 46, 27, 47, 72, 77, 64, 5, 1, 1, 42, 65, 72, 62, 57, 49, 38, 29, 1] },
      ha: { src: "/voices/mouhamad/ha.m4a", outline: [96, 89, 77, 1, 1, 100, 97, 91, 55, 23, 99, 82, 91, 78, 73, 82, 65, 63, 2, 82, 87, 74, 67, 81, 47, 51, 71, 47, 36, 32, 45, 52, 40, 1, 71, 51, 60, 47, 43, 22] },
    } },
] as const satisfies readonly Voice[];

export type VoiceId = (typeof VOICES)[number]["id"];

const BY_ID = new Map<string, Voice>(VOICES.map(v => [v.id, v]));
export const isVoiceId = (x: unknown): x is VoiceId => typeof x === "string" && BY_ID.has(x);
export const voice = (id: VoiceId): Voice => BY_ID.get(id)!;
export const voicesFor = (lang: LangCode): Voice[] => VOICES.filter(v => (v.languages as readonly string[]).includes(lang));
/** What a voice sounds like in a language it speaks; in its first language when it does not speak `lang`. */
export const sampleOf = (v: Pick<Voice, "languages" | "samples">, lang?: LangCode | null): Sample =>
  (lang ? v.samples[lang] : undefined) ?? v.samples[v.languages[0]]!;
