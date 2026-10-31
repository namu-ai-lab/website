/* The API landing page (/api), direction A "The storyteller" (founder's choice, 2026-10-31): real film at the top,
   a glass studio over it, then a few calm moments (the models, the console, the beta, questions, the way in).
   One sentence runs through the studio: Tafiya says it, Tatsuniya writes it down, Kora answers in French; all three
   are the models' own output, recorded through the API (public/usecases/README.md). Aïr's welcome is the home page
   call's. Claims gate: the API is in beta, open to anyone who signs up, free within 30 minutes of audio a month; every
   model is "In development" or "In research"; no prices, customers or benchmark numbers. Limits come from
   src/lib/limits.ts. No kickers, no sentence under every heading, no captions (founder's taste, namu-site-design).
   The film is licensed stock (Pexels); the people in it are never presented as Namu users. Credit: CREDITS.md.
   HA-REVIEW: the Hausa lines need a native speaker's check.
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication. */
import type { Lang } from "@/i18n/config";
import { formatNumber } from "@/i18n/format";
import { LIMITS } from "@/lib/limits";
import { MAX_ACTIVE_KEYS } from "@/lib/key-shape";
import { SAMPLES } from "./playground";
import { HEARD } from "./usecases";

const n = " ";   // narrow no-break space before French high punctuation
const fr = (s: string) => s.replace(/ ([:;!?»])/g, `${n}$1`).replace(/« /g, `«${n}`);

export type ApiTask = "speech" | "transcribe" | "translate" | "converse";
export const API_TASKS: ApiTask[] = ["speech", "transcribe", "translate", "converse"];
export const ENDPOINT: Record<ApiTask, string> = { speech: "/v1/speech", transcribe: "/v1/transcribe", translate: "/v1/translate", converse: "/v1/converse" };

/* The film at the top: muted, played once. Swap it here. */
export const FILM = { webm: "/api/storyteller.webm", mp4: "/api/storyteller.mp4", poster: "/api/storyteller.jpg" };

/* The studio's recordings and what each model returned. STORY is Tafiya's male voice (salim). */
const AIR = { src: "/converse/nadia/hello.m4a", text: "Sannu da zuwa! Ni ce Nadia, daga Namu. Muna gina fasahar murya don harsunan Afirka. Ku yi mini magana da Hausa, zan saurare ku." };
export const STUDIO = {
  sentence: SAMPLES.story.says,
  voice: "salim",
  heard: HEARD.text,
  story: SAMPLES.story.src,
  storyFr: SAMPLES.storyFr,
  air: AIR,
};

/* Each recording's loudness in 72 steps, measured from the file (ffmpeg, silence trimmed), for the voice line. */
export const ENVELOPE: Record<string, number[]> = {
  "/usecases/heritage.m4a": [.93,.88,.11,.06,.62,.79,.82,.95,.94,.77,.33,.30,.67,.66,.44,.66,.85,.52,.67,.72,.43,.73,.23,.74,.13,1.00,.75,.41,.38,.42,.43,.51,.61,.34,.08,.06,.46,.54,.64,.83,.58,.49,.42,.11,.08,.80,.71,.30,.20,.55,.40,.57,.50,.43,.40,.23,.90,.90,.43,.46,.47,.41,.71,.72,.74,.12,.58,.80,.82,.64,.35,.34],
  "/usecases/translation-fr-story.m4a": [.71,.56,.56,.47,.37,.26,.24,.21,.27,.28,.42,.44,.38,.12,.09,.06,.06,.11,.94,.87,.37,.56,.65,.71,.42,.17,.43,.36,.22,.59,.67,.74,.65,.46,.17,.08,.07,.06,.23,.20,.44,.50,.47,.26,.06,.51,.68,.73,.71,.46,.26,.11,.12,.36,.61,.57,.17,.40,.44,1.00,.97,.79,.32,.06,.09,.41,.63,.41,.35,.33,.27,.20],
  "/converse/nadia/hello.m4a": [.86,.45,.45,.95,.22,1.00,.90,.31,.22,.51,.58,.98,.63,.77,.71,.53,.61,.54,.52,.14,.14,.06,.06,.06,.35,.89,.78,.56,.84,.87,.68,.69,.91,.72,.45,.32,.82,.74,.61,.67,.42,.38,.56,.81,.51,.31,.12,.44,.06,.06,.06,.06,.06,.48,.43,.42,.82,.66,.88,.65,.81,.77,.65,.71,.46,.44,.54,.34,.33,.58,.51,.24],
};

export type ApiModel = { task: ApiTask; name: string; job: string; langs: string; limit: string; status: string };

export type ApiCopy = {
  meta: [string, string];
  h1: string; lede: string; start: string; docs: string;
  studio: {
    label: string; tabs: Record<ApiTask, string>; play: string; stop: string;
    wrote: string; answered: string; research: string; call: string;
    gloss: string; airGloss: string;
    copy: string; copied: string; copyFailed: string;
  };
  modelsH: string; labels: { endpoint: string; langs: string; limit: string; status: string }; models: ApiModel[];
  consoleH: string; consoleAlt: string; consoleCta: string;
  freeH: string; allowance: [string, string]; limits: [string, string][]; more: string; pricing: string;
  faqH: string; faq: [string, string][];
  endH: string;
};

const en: ApiCopy = {
  meta: ["API", "The Namu API, in beta: speech models for the languages of the Sahel. Hear, speak, translate and converse with one API, free during the beta."],
  h1: "Build with the voices of the Sahel",
  lede: "Hear, speak, translate and converse in the languages of the Sahel, with one API.",
  start: "Start building", docs: "Read the docs",
  studio: {
    label: "Try the models",
    tabs: { speech: "Speak", transcribe: "Transcribe", translate: "Translate", converse: "Converse" },
    play: "Play", stop: "Stop",
    wrote: "Tatsuniya wrote", answered: "Kora answered", research: "In research", call: "Try a live call",
    gloss: "Once, in a village, there lived an old storyteller.",
    airGloss: "Welcome! I’m Nadia, from Namu. We build voice technology for African languages. Speak to me in Hausa; I’m listening.",
    copy: "Copy", copied: "Copied", copyFailed: "Not copied: the text is selected",
  },
  modelsH: "Four models, one key",
  labels: { endpoint: "Endpoint", langs: "Languages", limit: "Per request", status: "Status" },
  models: [
    { task: "speech", name: "Tafiya", job: "Text to speech", langs: "Hausa, and a French reference voice", limit: `Up to ${formatNumber("en", LIMITS.textChars)} characters`, status: "In development" },
    { task: "transcribe", name: "Tatsuniya", job: "Speech to text", langs: "Hausa", limit: `Up to ${LIMITS.uploadMb} MB or ${LIMITS.audioMinutes} minutes`, status: "In development" },
    { task: "translate", name: "Kora", job: "Speech translation", langs: "Hausa and French", limit: `Up to ${LIMITS.uploadMb} MB or ${LIMITS.audioMinutes} minutes`, status: "In development" },
    { task: "converse", name: "Aïr", job: "Spoken conversation", langs: "Hausa", limit: "One spoken turn", status: "In research" },
  ],
  consoleH: "Your keys, usage and logs in one place",
  consoleAlt: "The Namu console’s Home page, with sample data: getting started, the month’s usage, recent requests and the models.",
  consoleCta: "Open the console",
  freeH: "Free while we are in beta",
  allowance: ["30", "minutes of audio every month"],
  limits: [
    [`${LIMITS.keyPerMin}`, "requests a minute"],
    [`${LIMITS.uploadMb} MB`, "per audio file"],
    [formatNumber("en", LIMITS.textChars), "characters per request"],
    [`${MAX_ACTIVE_KEYS}`, "keys per account"],
  ],
  more: "Need more? Write to us", pricing: "Pricing will be published with each model’s release.",
  faqH: "Questions",
  faq: [
    ["Which languages does the API cover?", "Hausa today, with French for translation and a French reference voice. The Lab works on the languages of the Sahel one at a time, and a language reaches the API once its models are measured and released."],
    ["What counts towards the free allowance?", "Audio minutes: the audio you send, and for text to speech, the speech you get back. Every response tells you how much it counted, and the console adds it up. It resets on the first of each month (UTC)."],
    ["What do you keep from my requests?", "Usage records: which model, when, how much audio, how long it took and the status code. The console’s logs never hold the audio or the text."],
    ["Is it ready for production?", "It is a beta: endpoints may change, and every model is in development or in research. Build prototypes and pilots now, and talk to us before you put it in front of many people."],
    ["Are there SDKs?", "Not yet. The API is plain HTTPS with JSON, and the docs show every call in cURL, Python and JavaScript."],
  ],
  endH: "Your first request is free",
};

const frCopy: ApiCopy = {
  meta: ["API", fr("L’API de Namu, en bêta : des modèles de parole pour les langues du Sahel. Écouter, parler, traduire et converser avec une seule API, gratuite pendant la bêta.")],
  h1: "Créez avec les voix du Sahel",
  lede: "Écouter, parler, traduire et converser dans les langues du Sahel, avec une seule API.",
  start: "Commencer", docs: "Lire la documentation",
  studio: {
    label: "Essayer les modèles",
    tabs: { speech: "Parler", transcribe: "Transcrire", translate: "Traduire", converse: "Converser" },
    play: "Écouter", stop: "Arrêter",
    wrote: "Tatsuniya a écrit", answered: "Kora a répondu", research: "En recherche", call: "Essayer un appel en direct",
    gloss: "Un jour, dans un village, vivait un vieux conteur.",
    airGloss: fr("Bienvenue ! Je suis Nadia, de Namu. Nous construisons des technologies vocales pour les langues africaines. Parlez-moi en hausa ; je vous écoute."),
    copy: "Copier", copied: "Copié", copyFailed: fr("Non copié : le texte est sélectionné"),
  },
  modelsH: "Quatre modèles, une clé",
  labels: { endpoint: "Point d’accès", langs: "Langues", limit: "Par requête", status: "Statut" },
  models: [
    { task: "speech", name: "Tafiya", job: "Texte vers parole", langs: "Hausa, et une voix de référence en français", limit: `Jusqu’à ${formatNumber("fr", LIMITS.textChars)} caractères`, status: "En développement" },
    { task: "transcribe", name: "Tatsuniya", job: "Parole vers texte", langs: "Hausa", limit: `Jusqu’à ${LIMITS.uploadMb} Mo ou ${LIMITS.audioMinutes} minutes`, status: "En développement" },
    { task: "translate", name: "Kora", job: "Traduction de la parole", langs: "Hausa et français", limit: `Jusqu’à ${LIMITS.uploadMb} Mo ou ${LIMITS.audioMinutes} minutes`, status: "En développement" },
    { task: "converse", name: "Aïr", job: "Conversation parlée", langs: "Hausa", limit: "Un tour de parole", status: "En recherche" },
  ],
  consoleH: "Vos clés, votre consommation et vos journaux au même endroit",
  consoleAlt: fr("L’accueil de la console Namu, avec des données d’exemple : prise en main, consommation du mois, dernières requêtes et modèles."),
  consoleCta: "Ouvrir la console",
  freeH: "Gratuit pendant la bêta",
  allowance: ["30", "minutes d’audio chaque mois"],
  limits: [
    [`${LIMITS.keyPerMin}`, "requêtes par minute"],
    [`${LIMITS.uploadMb} Mo`, "par fichier audio"],
    [formatNumber("fr", LIMITS.textChars), "caractères par requête"],
    [`${MAX_ACTIVE_KEYS}`, "clés par compte"],
  ],
  more: fr("Besoin de plus ? Écrivez-nous"), pricing: "Les tarifs seront publiés avec chaque modèle.",
  faqH: "Questions",
  faq: [
    ["Quelles langues l’API couvre-t-elle ?", "Le hausa aujourd’hui, avec le français pour la traduction et une voix de référence en français. Le Lab travaille sur les langues du Sahel une à une, et une langue arrive dans l’API une fois ses modèles mesurés et publiés."],
    ["Qu’est-ce qui compte dans le quota gratuit ?", fr("Les minutes d’audio : l’audio que vous envoyez et, pour la synthèse vocale, la parole que vous recevez. Chaque réponse indique ce qu’elle a compté, et la console fait le total. Le quota repart à zéro le premier de chaque mois (UTC).")],
    ["Que gardez-vous de mes requêtes ?", fr("Des relevés de consommation : quel modèle, quand, combien d’audio, en combien de temps et avec quel statut. Les journaux de la console ne contiennent jamais l’audio ni le texte.")],
    ["Est-ce prêt pour la production ?", fr("C’est une bêta : les points d’accès peuvent changer, et chaque modèle est en développement ou en recherche. Construisez des prototypes et des pilotes dès maintenant, et parlez-nous avant de les mettre devant beaucoup de monde.")],
    ["Existe-t-il des SDK ?", "Pas encore. L’API est du HTTPS simple avec du JSON, et la documentation montre chaque appel en cURL, Python et JavaScript."],
  ].map(([q, a]) => [fr(q), a] as [string, string]),
  endH: "Votre première requête est gratuite",
};

export const apiCopy: Record<Lang, ApiCopy> = { en, fr: frCopy };
