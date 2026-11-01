/* The voices and Aïr personas the API serves: the website's copy of VOICES and PERSONAS in
   platform/modal/namu_gateway.py (platform/tests/test_gateway.py checks the two agree). Browser-safe.
   Withdrawn on 2026-10-31, with no consent record for its speaker: salim, a cloned Hausa voice (and Aïr's persona of
   that name). A request naming it is refused with 400 unknown_voice or unknown_persona; nothing falls back to another
   voice. fr, the French reference voice, withdrawn the same day, is back since 2026-11-01, when the founder confirmed
   its consent. "warm" is an alias of nadia. */
export const VOICES = ["nadia", "warm", "fr"] as const;
export type VoiceId = (typeof VOICES)[number];
export const PERSONAS = ["nadia"] as const;
export type PersonaId = (typeof PERSONAS)[number];

export const isVoice = (x: unknown): x is VoiceId => typeof x === "string" && (VOICES as readonly string[]).includes(x);
export const isPersona = (x: unknown): x is PersonaId => typeof x === "string" && (PERSONAS as readonly string[]).includes(x);
