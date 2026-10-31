/* The home page console: try every one of the Lab's models (after elevenlabs.io's hero panel: tabs across the top, one
   object in the middle of each, a bar of choices underneath). Every tab is live, through /api/demo with the demo's
   limits (300 characters, 15 seconds of audio, 30 requests an hour per visitor); Converse is Aïr, in research.
   HA-REVIEW: every Hausa sentence below was written for this preview and needs a native speaker's check.
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication. */
import type { Lang } from "@/i18n/config";

const n = " ";   // narrow no-break space before French high punctuation

export type Script = { id: string; label: string; text: string; gloss: string };
/* palette: main, light, deep, and an accent of another hue that drifts through it */
export type Voice = { id: string; name: string; note: string; palette: readonly string[] };

export type Tab = "tts" | "stt" | "translate" | "converse" | "api";
/* a short clip a visitor can send instead of recording: what it says, and what that means */
export type Sample = { id: string; label: string; src: string; says: string; meaning: string };

export type PlaygroundCopy = {
  sub: string;
  tabs: { id: Tab; label: string; dot: [string, string, string] }[];
  build: string;
  tts: {
    scripts: string; voices: string; previous: string; next: string; play: string; stop: string; generate: string;
    label: string; placeholder: string; count: (n: number, max: number) => string; example: string; live: string; download: string; empty: string; limit: string;
  };
  listen: {
    record: string; stop: string; upload: string; samples: string; idle: string; idleTranslate: { fr: string; ha: string };
    listening: (s: number) => string; transcribing: string; translating: string; result: string; empty: string; emptyTranslate: string;
    heard: string; translation: string; playTranslation: string; copy: string; copied: string; copyFailed: string; langs: { ha: string; fr: string };
    mic: string; tooLong: string; trimmed: string; unheard: string; badFile: string; seconds: (s: string) => string; limit: string;
    direction: string; dirs: { fr: string; ha: string };
  };
  converse: { start: string; end: string; connecting: string; idle: string; listening: string; thinking: string; speaking: string; voice: string; mic: string };
  api: { run: string; running: string; output: string; note: string };
  live: { working: string; waking: string; unavailable: string; limited: string; failed: string };
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

/* The live API's Hausa voice (GET /v1/voices; lib/voices). The male voice, salim, was withdrawn on 2026-10-31: there is
   no consent record for its speaker. Add a voice here only once the API serves it. */
export const voices: Record<Lang, Voice[]> = {
  en: [
    { id: "nadia", name: "Female", note: "Hausa · warm and patient", palette: ["#f0884f", "#ffe3cc", "#b23e1f", "#ec6b80"] },
  ],
  fr: [
    { id: "nadia", name: "Féminine", note: "Haoussa · chaleureuse et patiente", palette: ["#f0884f", "#ffe3cc", "#b23e1f", "#ec6b80"] },
  ],
};

/* the listening orbs: Tatsuniya in kola and clay, Kora with the blue of the other language drifting through */
export const listenPalettes = {
  stt: ["#c4865a", "#f6e6d6", "#5e3418", "#e8935a"],
  translate: ["#8fa6d6", "#f4ece2", "#7a4325", "#e8935a"],
} as const;

export const translation = {
  ha: "Ina so in sayi gero a kasuwa gobe da safe.",
  fr: "Je voudrais acheter du mil au marché demain matin.",
};

/* Clips for Speech to text and Translate, so a visitor without a microphone can still try them (public/usecases/README.md):
   Hausa spoken by Tafiya, and French spoken by Kora when it translated two of those Hausa clips. */
const SAMPLES = {
  market: { src: "/usecases/translation-ha.m4a", says: "Nawa ne farashin buhun gero?" },
  story: { src: "/usecases/heritage.m4a", says: "Wata rana, a wani ƙauye, akwai wani tsoho mai ba da labari." },
  count: { src: "/usecases/education.m4a", says: "Bari mu koyi ƙidaya tare: ɗaya, biyu, uku, huɗu, biyar." },
  storyFr: { src: "/usecases/translation-fr-story.m4a", says: "Un jour, dans un village, il y avait un vieux conteur." },
  formFr: { src: "/usecases/translation-fr-form.m4a", says: "Nous allons vous aider à remplir le formulaire étape par étape." },
};
export const samples: Record<Lang, { stt: Sample[]; translate: { fr: Sample[]; ha: Sample[] } }> = {
  en: {
    stt: [
      { id: "market", label: "At the market", ...SAMPLES.market, meaning: "How much is a sack of millet?" },
      { id: "story", label: "A storyteller", ...SAMPLES.story, meaning: "Once, in a village, there lived an old storyteller." },
      { id: "count", label: "Counting", ...SAMPLES.count, meaning: "Let’s learn to count together: one, two, three, four, five." },
    ],
    translate: {
      fr: [
        { id: "market", label: "At the market", ...SAMPLES.market, meaning: "How much is a sack of millet?" },
        { id: "story", label: "A storyteller", ...SAMPLES.story, meaning: "Once, in a village, there lived an old storyteller." },
      ],
      ha: [
        { id: "story-fr", label: "A storyteller", ...SAMPLES.storyFr, meaning: "One day, in a village, there was an old storyteller." },
        { id: "form-fr", label: "Filling in a form", ...SAMPLES.formFr, meaning: "We will help you fill in the form, step by step." },
      ],
    },
  },
  fr: {
    stt: [
      { id: "market", label: "Au marché", ...SAMPLES.market, meaning: `Combien coûte un sac de mil${n}?` },
      { id: "story", label: "Un conteur", ...SAMPLES.story, meaning: "Un jour, dans un village, vivait un vieux conteur." },
      { id: "count", label: "Compter", ...SAMPLES.count, meaning: `Apprenons à compter ensemble${n}: un, deux, trois, quatre, cinq.` },
    ],
    translate: {
      fr: [
        { id: "market", label: "Au marché", ...SAMPLES.market, meaning: `Combien coûte un sac de mil${n}?` },
        { id: "story", label: "Un conteur", ...SAMPLES.story, meaning: "Un jour, dans un village, vivait un vieux conteur." },
      ],
      ha: [
        { id: "story-fr", label: "Un conteur", ...SAMPLES.storyFr, meaning: "Un jour, dans un village, il y avait un vieux conteur." },
        { id: "form-fr", label: "Un formulaire", ...SAMPLES.formFr, meaning: "Nous allons vous aider à remplir le formulaire étape par étape." },
      ],
    },
  },
};

export const playground: Record<Lang, PlaygroundCopy> = {
  en: {
    sub: "Hear, speak, translate and converse in the languages of the Sahel",
    tabs: [
      { id: "converse", label: "Converse", dot: ["#e8935a", "#7a4325", "#1c1410"] },
      { id: "tts", label: "Text to speech", dot: ["#f29a5f", "#ffd8b8", "#b4552a"] },
      { id: "stt", label: "Transcribe", dot: ["#c4865a", "#f6e6d6", "#5e3418"] },
      { id: "translate", label: "Translate", dot: ["#8fa6d6", "#f4ece2", "#7a4325"] },
      { id: "api", label: "API", dot: ["#a39a90", "#ece7e1", "#4a453f"] },
    ],
    build: "Start building",
    tts: {
      scripts: "Examples", voices: "Voices", previous: "Previous voice", next: "Next voice", play: "Play", stop: "Stop", generate: "Generate",
      label: "Text for Tafiya to read", placeholder: "Type or paste Hausa text, or pick an example below.", count: (k, m) => `${k} / ${m}`,
      example: "Example, generated earlier by Tafiya", live: "Your text, generated live by Tafiya", download: "Download",
      empty: "Type some Hausa text first.", limit: "Live demo: up to 300 characters a request.",
    },
    listen: {
      record: "Record", stop: "Stop recording", upload: "Upload a clip", samples: "Samples",
      idle: "Record up to 15 seconds of Hausa, upload a clip, or try a sample.",
      idleTranslate: { fr: "Speak Hausa for up to 15 seconds: Kora answers in French.", ha: "Speak French for up to 15 seconds: Kora answers in Hausa." },
      listening: s => `Listening… ${s} s left. Tap to stop.`, transcribing: "Transcribing…", translating: "Translating…",
      result: "Transcript", empty: "What Tatsuniya hears will be written here.", emptyTranslate: "Kora’s translation will appear here.",
      heard: "Heard", translation: "Translation", playTranslation: "Play the translation", copy: "Copy", copied: "Copied", copyFailed: "Not copied: the text is selected", langs: { ha: "Hausa", fr: "French" },
      mic: "Allow the microphone to record, or upload a clip instead.", tooLong: "Keep it under 15 seconds.", trimmed: "Only the first 15 seconds were sent.",
      unheard: "Nothing could be heard in that clip. Try again a little closer to the microphone.", badFile: "That file could not be read as audio.",
      seconds: s => `${s} s of audio`, limit: "Live demo: up to 15 seconds a clip.",
      direction: "Direction", dirs: { fr: "Hausa → French", ha: "French → Hausa" },
    },
    converse: {
      start: "Call Aïr", end: "End call", connecting: "Connecting…", idle: "Talk with Aïr, in Hausa", listening: "Listening…", thinking: "Thinking…",
      speaking: "Aïr is speaking. Tap to interrupt", voice: "Voice", mic: "Allow the microphone to talk with Aïr.",
    },
    api: { run: "Run code", running: "Running…", output: "Output", note: "Runs on the live demo. In your app, your own key takes the demo’s place." },
    live: {
      working: "Generating…", waking: "Waking the model: the first request can take about 20 seconds.",
      unavailable: "The live demo is not available right now.", limited: "Demo limit reached for now. Get an API key to keep going.", failed: "The model did not answer. Try again in a moment.",
    },
  },
  fr: {
    sub: "Écouter, parler, traduire et converser dans les langues du Sahel",
    tabs: [
      { id: "converse", label: "Converser", dot: ["#e8935a", "#7a4325", "#1c1410"] },
      { id: "tts", label: "Synthèse vocale", dot: ["#f29a5f", "#ffd8b8", "#b4552a"] },
      { id: "stt", label: "Transcription", dot: ["#c4865a", "#f6e6d6", "#5e3418"] },
      { id: "translate", label: "Traduction", dot: ["#8fa6d6", "#f4ece2", "#7a4325"] },
      { id: "api", label: "API", dot: ["#a39a90", "#ece7e1", "#4a453f"] },
    ],
    build: "Commencer à construire",
    tts: {
      scripts: "Exemples", voices: "Voix", previous: "Voix précédente", next: "Voix suivante", play: "Lire", stop: "Arrêter", generate: "Générer",
      label: "Le texte que Tafiya va lire", placeholder: "Tapez ou collez un texte en haoussa, ou choisissez un exemple ci-dessous.", count: (k, m) => `${k} / ${m}`,
      example: "Exemple, généré à l’avance par Tafiya", live: "Votre texte, généré en direct par Tafiya", download: "Télécharger",
      empty: "Tapez d’abord un texte en haoussa.", limit: `Démo en direct${n}: jusqu’à 300 caractères par requête.`,
    },
    listen: {
      record: "Enregistrer", stop: "Arrêter l’enregistrement", upload: "Envoyer un extrait", samples: "Extraits",
      idle: "Enregistrez jusqu’à 15 secondes en haoussa, envoyez un extrait ou essayez un exemple.",
      idleTranslate: { fr: `Parlez haoussa jusqu’à 15 secondes${n}: Kora répond en français.`, ha: `Parlez français jusqu’à 15 secondes${n}: Kora répond en haoussa.` },
      listening: s => `À l’écoute… encore ${s}${n}s. Touchez pour arrêter.`, transcribing: "Transcription…", translating: "Traduction…",
      result: "Transcription", empty: "Ce que Tatsuniya entend s’écrira ici.", emptyTranslate: "La traduction de Kora s’affichera ici.",
      heard: "Entendu", translation: "Traduction", playTranslation: "Écouter la traduction", copy: "Copier", copied: "Copié", copyFailed: `Non copié${n}: le texte est sélectionné`, langs: { ha: "Haoussa", fr: "Français" },
      mic: "Autorisez le micro pour enregistrer, ou envoyez plutôt un extrait.", tooLong: "Restez sous les 15 secondes.", trimmed: "Seules les 15 premières secondes ont été envoyées.",
      unheard: "Rien n’a pu être entendu dans cet extrait. Réessayez un peu plus près du micro.", badFile: "Ce fichier n’a pas pu être lu comme de l’audio.",
      seconds: s => `${s}${n}s d’audio`, limit: `Démo en direct${n}: jusqu’à 15 secondes par extrait.`,
      direction: "Sens", dirs: { fr: "Haoussa → français", ha: "Français → haoussa" },
    },
    converse: {
      start: "Appeler Aïr", end: "Raccrocher", connecting: "Connexion…", idle: "Parlez avec Aïr, en haoussa", listening: "À l’écoute…", thinking: "Réflexion…",
      speaking: "Aïr parle. Touchez pour l’interrompre", voice: "Voix", mic: "Autorisez le micro pour parler avec Aïr.",
    },
    api: { run: "Exécuter", running: "Exécution…", output: "Résultat", note: "S’exécute sur la démo en direct. Dans votre application, votre propre clé remplace celle de la démo." },
    live: {
      working: "Génération…", waking: `Réveil du modèle${n}: la première requête peut prendre une vingtaine de secondes.`,
      unavailable: "La démo en direct n’est pas disponible pour le moment.", limited: "Limite de la démo atteinte. Obtenez une clé d’API pour continuer.", failed: "Le modèle n’a pas répondu. Réessayez dans un instant.",
    },
  },
};
