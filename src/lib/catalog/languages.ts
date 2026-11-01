/* The spoken languages the platform knows: one entry each. Everything that lists languages (Speak, Transcribe,
   project columns, voice filters, agents) reads this list, and a language becomes usable for a task when a model in
   ./models.ts lists it. Adding a language is one entry here; switching it on is one code in a model.
   Browser-safe.

   code       BCP 47, as the gateway's `language` fields use it
   endonym    the language's own name, shown everywhere
   name       its name in each interface language
   countries  where it is spoken in the region (ISO 3166-1), for filters
   letters    the letters a keyboard often lacks, offered under text boxes (each must exist in the site's fonts:
              npm run check-glyphs)
   digraphs   how people type those letters without them, fixed on request (Hausa: b' for ɓ, and so on)
   Zarma's letters are the 1999 alphabet's ŋ and ɲ (zarma-exploration langs/dje, language pack dje-1.0).
   NATIVE-REVIEW: Zarma's digraphs, and the letters and digraphs for Fulfulde and Tamasheq, wait for a native reviewer
   and for the fonts to carry their letters (ǝ, ɣ...). */
import type { Lang } from "@/i18n/config";

export type Language = {
  code: string;
  endonym: string;
  name: Record<Lang, string>;
  countries: readonly string[];
  letters: readonly string[];
  digraphs: Readonly<Record<string, string>>;
};

export const LANGUAGES = [
  {
    code: "ha", endonym: "Hausa", name: { en: "Hausa", fr: "Haoussa" }, countries: ["NE", "NG", "GH", "TD", "CM"],
    letters: ["ɓ", "ɗ", "ƙ", "ƴ", "ʼ"], digraphs: { "b'": "ɓ", "d'": "ɗ", "k'": "ƙ", "y'": "ƴ", "B'": "Ɓ", "D'": "Ɗ", "K'": "Ƙ", "Y'": "Ƴ" },
  },
  { code: "dje", endonym: "Zarma", name: { en: "Zarma", fr: "Zarma" }, countries: ["NE", "ML", "BF", "NG"], letters: ["ŋ", "ɲ"], digraphs: {} },
  { code: "ff", endonym: "Fulfulde", name: { en: "Fulfulde", fr: "Peul" }, countries: ["NE", "ML", "BF", "NG", "SN", "GN", "CM", "TD"], letters: ["ɓ", "ɗ", "ƴ", "ɲ"], digraphs: {} },
  { code: "tmh", endonym: "Tamajaq", name: { en: "Tamasheq", fr: "Tamasheq" }, countries: ["NE", "ML", "BF", "DZ"], letters: [], digraphs: {} },
  { code: "fr", endonym: "Français", name: { en: "French", fr: "Français" }, countries: ["NE", "ML", "BF", "SN", "TD", "CI"], letters: [], digraphs: {} },
] as const satisfies readonly Language[];

export type LangCode = (typeof LANGUAGES)[number]["code"];

/** The local languages, in the order the platform shows them; French is the language organisations write in. */
export const LOCAL: readonly LangCode[] = ["ha", "dje", "ff", "tmh"];
export const WRITTEN: LangCode = "fr";

const BY_CODE = new Map<string, Language>(LANGUAGES.map(l => [l.code, l]));
export const isLangCode = (x: unknown): x is LangCode => typeof x === "string" && BY_CODE.has(x);
export const language = (code: LangCode): Language => BY_CODE.get(code)!;
