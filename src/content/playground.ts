/* The home page console: try the Lab's models (after elevenlabs.io's hero panel: three tabs, one object
   in the middle of each, a bar of choices underneath). Speak and the API tab are live, through /api/demo
   with the demo's limits; Converse is a timed preview while Aïr is in research.
   HA-REVIEW: every Hausa sentence below was written for this preview and needs a native speaker's check.
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication. */
import type { Lang } from "@/i18n/config";

const n = " ";   // narrow no-break space before French high punctuation

export type Script = { id: string; label: string; text: string; gloss: string };
/* palette: main, light, deep, and an accent of another hue that drifts through it */
export type Voice = { id: string; name: string; note: string; palette: readonly string[] };

export type Tab = "speak" | "converse" | "api";

export type PlaygroundCopy = {
  sub: string;
  tabs: { id: Tab; label: string; dot: [string, string, string] }[];
  build: string;
  speak: { scripts: string; voices: string; previous: string; next: string; play: string; stop: string };
  converse: { start: string; end: string; connecting: string; idle: string; listening: string; thinking: string; speaking: string; voice: string; you: string; air: string; mic: string };
  api: { run: string; running: string; output: string; note: string };
  live: { working: string; unavailable: string; limited: string; failed: string };
};

export const scripts: Record<Lang, Script[]> = {
  en: [
    { id: "greet", label: "Welcome", text: "Sannu da zuwa! Muna farin cikin jin muryarku.", gloss: "Welcome! We are glad to hear your voice." },
    { id: "weather", label: "Weather", text: "Ina kwana? Yau za a yi zafi sosai, don haka ku sha ruwa da yawa.", gloss: "Good morning! It will be very hot today, so drink plenty of water." },
    { id: "clinic", label: "Clinic reminder", text: "Kar ki manta, gobe da safe ki kawo jaririnki asibiti don allurar rigakafi.", gloss: "Don’t forget: tomorrow morning, bring your baby to the clinic for the vaccination." },
    { id: "farm", label: "Farming", text: "Damina ta kama. Lokaci ya yi da manoma su fara shuka gero da dawa.", gloss: "The rainy season has set in. It is time for farmers to start sowing millet and sorghum." },
  ],
  fr: [
    { id: "greet", label: "Bienvenue", text: "Sannu da zuwa! Muna farin cikin jin muryarku.", gloss: `Bienvenue${n}! Nous sommes heureux d’entendre votre voix.` },
    { id: "weather", label: "Météo", text: "Ina kwana? Yau za a yi zafi sosai, don haka ku sha ruwa da yawa.", gloss: `Bonjour${n}! Il fera très chaud aujourd’hui, alors buvez beaucoup d’eau.` },
    { id: "clinic", label: "Rappel de vaccination", text: "Kar ki manta, gobe da safe ki kawo jaririnki asibiti don allurar rigakafi.", gloss: `N’oubliez pas${n}: demain matin, amenez votre bébé au centre de santé pour la vaccination.` },
    { id: "farm", label: "Agriculture", text: "Damina ta kama. Lokaci ya yi da manoma su fara shuka gero da dawa.", gloss: "La saison des pluies s’est installée. Il est temps pour les agriculteurs de semer le mil et le sorgho." },
  ],
};

/* The live API's two Hausa voices (GET /v1/voices): ids nadia and salim, shown as the female and the male voice. */
export const voices: Record<Lang, Voice[]> = {
  en: [
    { id: "nadia", name: "Female", note: "Hausa · warm and patient", palette: ["#f0884f", "#ffe3cc", "#b23e1f", "#ec6b80"] },
    { id: "salim", name: "Male", note: "Hausa · direct and steady", palette: ["#7c9bd2", "#f4e7d7", "#2e3f6b", "#e8935a"] },
  ],
  fr: [
    { id: "nadia", name: "Féminine", note: "Haoussa · chaleureuse et patiente", palette: ["#f0884f", "#ffe3cc", "#b23e1f", "#ec6b80"] },
    { id: "salim", name: "Masculine", note: "Haoussa · direct et posé", palette: ["#7c9bd2", "#f4e7d7", "#2e3f6b", "#e8935a"] },
  ],
};

export const translation = {
  ha: "Ina so in sayi gero a kasuwa gobe da safe.",
  fr: "Je voudrais acheter du mil au marché demain matin.",
};

export const playground: Record<Lang, PlaygroundCopy> = {
  en: {
    sub: "Hear, speak, translate and converse in the languages of the Sahel",
    tabs: [
      { id: "speak", label: "Speak", dot: ["#f29a5f", "#ffd8b8", "#b4552a"] },
      { id: "converse", label: "Converse", dot: ["#e8935a", "#7a4325", "#1c1410"] },
      { id: "api", label: "API", dot: ["#a39a90", "#ece7e1", "#4a453f"] },
    ],
    build: "Start building",
    speak: { scripts: "What the voice reads", voices: "Voices", previous: "Previous voice", next: "Next voice", play: "Play", stop: "Stop" },
    converse: {
      start: "Call Aïr", end: "End call", connecting: "Connecting…", idle: "Talk with Aïr, in Hausa", listening: "Listening…", thinking: "Thinking…",
      speaking: "Aïr is speaking. Tap to interrupt", voice: "Voice", you: "You", air: "Aïr", mic: "Allow the microphone to talk with Aïr.",
    },
    api: { run: "Run code", running: "Running…", output: "Output", note: "Runs on the live demo. In your app, your own key takes the demo’s place." },
    live: { working: "Generating…", unavailable: "The live demo is not available right now.", limited: "Demo limit reached for now. Get an API key to keep going.", failed: "The model did not answer. Try again in a moment." },
  },
  fr: {
    sub: "Écouter, parler, traduire et converser dans les langues du Sahel",
    tabs: [
      { id: "speak", label: "Parler", dot: ["#f29a5f", "#ffd8b8", "#b4552a"] },
      { id: "converse", label: "Converser", dot: ["#e8935a", "#7a4325", "#1c1410"] },
      { id: "api", label: "API", dot: ["#a39a90", "#ece7e1", "#4a453f"] },
    ],
    build: "Commencer à construire",
    speak: { scripts: "Ce que lit la voix", voices: "Voix", previous: "Voix précédente", next: "Voix suivante", play: "Lire", stop: "Arrêter" },
    converse: {
      start: "Appeler Aïr", end: "Raccrocher", connecting: "Connexion…", idle: "Parlez avec Aïr, en haoussa", listening: "À l’écoute…", thinking: "Réflexion…",
      speaking: "Aïr parle. Touchez pour l’interrompre", voice: "Voix", you: "Vous", air: "Aïr", mic: "Autorisez le micro pour parler avec Aïr.",
    },
    api: { run: "Exécuter", running: "Exécution…", output: "Résultat", note: "S’exécute sur la démo en direct. Dans votre application, votre propre clé remplace celle de la démo." },
    live: { working: "Génération…", unavailable: "La démo en direct n’est pas disponible pour le moment.", limited: "Limite de la démo atteinte. Obtenez une clé d’API pour continuer.", failed: "Le modèle n’a pas répondu. Réessayez dans un instant." },
  },
};
