/* The home page console: a design preview of trying the Lab's models (after elevenlabs.io's hero panel:
   three tabs, one object in the middle of each, a bar of choices underneath). Nothing here is connected
   to a model yet.
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
  converse: { start: string; end: string; connecting: string };
  api: { run: string; running: string; output: string };
};

export const scripts: Record<Lang, Script[]> = {
  en: [
    { id: "news", label: "Morning news", text: "Barka da safiya! Ga labaran yau daga Yamai da Kano: an yi ruwan sama mai yawa a daren jiya.", gloss: "Good morning! Here is today’s news from Niamey and Kano: there was heavy rain last night." },
    { id: "clinic", label: "Clinic reminder", text: "Sannu Hauwa. Muna tunatar da ke cewa ganinki da likita gobe ne, da ƙarfe tara na safe.", gloss: "Hello Hauwa. A reminder that your appointment with the doctor is tomorrow, at nine in the morning." },
    { id: "market", label: "Market prices", text: "Farashin gero a kasuwar Maraɗi ya sauka kaɗan a wannan mako.", gloss: "The price of millet at Maradi market fell a little this week." },
    { id: "tale", label: "Folktale", text: "Gatanan, gatananku! Wata rana Gizo ya tafi kasuwa da ƙwarya cike da zuma.", gloss: "Once upon a time! One day Spider went to the market with a calabash full of honey." },
  ],
  fr: [
    { id: "news", label: "Journal du matin", text: "Barka da safiya! Ga labaran yau daga Yamai da Kano: an yi ruwan sama mai yawa a daren jiya.", gloss: `Bonjour${n}! Voici les nouvelles du jour depuis Niamey et Kano${n}: il a beaucoup plu la nuit dernière.` },
    { id: "clinic", label: "Rappel de rendez-vous", text: "Sannu Hauwa. Muna tunatar da ke cewa ganinki da likita gobe ne, da ƙarfe tara na safe.", gloss: "Bonjour Hauwa. Nous vous rappelons votre rendez-vous chez le médecin demain, à neuf heures du matin." },
    { id: "market", label: "Prix du marché", text: "Farashin gero a kasuwar Maraɗi ya sauka kaɗan a wannan mako.", gloss: "Le prix du mil au marché de Maradi a un peu baissé cette semaine." },
    { id: "tale", label: "Conte", text: "Gatanan, gatananku! Wata rana Gizo ya tafi kasuwa da ƙwarya cike da zuma.", gloss: `Il était une fois${n}! Un jour, l’Araignée partit au marché avec une calebasse pleine de miel.` },
  ],
};

export const voices: Record<Lang, Voice[]> = {
  en: [
    { id: "warm", name: "Warm", note: "Even and close, for reading", palette: ["#f0884f", "#ffe3cc", "#b23e1f", "#ec6b80"] },
    { id: "bright", name: "Bright", note: "Clear and quick, for news", palette: ["#ffbe48", "#fff4d6", "#df7429", "#f59fbe"] },
    { id: "calm", name: "Calm", note: "Slow and steady, for care", palette: ["#c29be0", "#fbeff6", "#6c47a0", "#f2a0b6"] },
    { id: "story", name: "Storyteller", note: "Lively, for tales", palette: ["#9a4f2c", "#f6b679", "#24130d", "#e45f38"] },
    { id: "radio", name: "Radio", note: "Steady and clear, for announcements", palette: ["#7c9bd2", "#f4e7d7", "#2e3f6b", "#e8935a"] },
  ],
  fr: [
    { id: "warm", name: "Chaleureuse", note: "Égale et proche, pour la lecture", palette: ["#f0884f", "#ffe3cc", "#b23e1f", "#ec6b80"] },
    { id: "bright", name: "Claire", note: "Nette et vive, pour l’info", palette: ["#ffbe48", "#fff4d6", "#df7429", "#f59fbe"] },
    { id: "calm", name: "Posée", note: "Lente et sûre, pour le soin", palette: ["#c29be0", "#fbeff6", "#6c47a0", "#f2a0b6"] },
    { id: "story", name: "Conteuse", note: "Vivante, pour les contes", palette: ["#9a4f2c", "#f6b679", "#24130d", "#e45f38"] },
    { id: "radio", name: "Radio", note: "Posée et nette, pour les annonces", palette: ["#7c9bd2", "#f4e7d7", "#2e3f6b", "#e8935a"] },
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
    converse: { start: "Call Aïr", end: "End call", connecting: "Connecting…" },
    api: { run: "Run code", running: "Running…", output: "Output" },
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
    converse: { start: "Appeler Aïr", end: "Raccrocher", connecting: "Connexion…" },
    api: { run: "Exécuter", running: "Exécution…", output: "Résultat" },
  },
};
