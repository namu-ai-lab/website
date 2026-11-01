import type { Lang } from "@/i18n/config";
import type { IconName } from "@/lib/icons";
import type { LangCode, VoiceId } from "@/lib/catalog";

/* The home page's use cases, after openai.com's "Use cases driven by our platform": six things people can build with
   the Lab's models, each with a photograph of the people it is for. Where openai.com opens a list of customer
   stories, these open what the use case sounds like, the same way in every case: one line said in Zarma (first), in
   Hausa by two voices, and in French, each recorded through the Lab's own models (public/usecases/README.md), with its
   meaning and the models it would be built on. The voices are numbered, not named. Translation follows each line with
   its translation (Kora's own from Hausa and French; Zarma's French said by Tafiya, Kora not translating Zarma yet);
   Heritage shows, for Hausa, what Tatsuniya wrote down on hearing it.

   The lines were chosen among candidates for being said well by every voice: each candidate was said three times per
   voice and read back by a speech recogniser, and the line with the best worst voice kept. The Zarma is built from
   native-written Zarma (SMOL, Google, CC-BY-4.0; the Peace Corps/Niger dictionary) and follows the 1999 alphabet.
   NATIVE-REVIEW: the Zarma and the Hausa wait for a native speaker's check. */

export type Clip = { src: string; text: string; lang: LangCode; by: string };
/** A use case said in one voice and language. */
export type Voicing = {
  voice: VoiceId;
  lang: LangCode;
  clips: Clip[];                 // played one after the other
  gloss: string;                 // what it says, in the page's language (empty when a clip already says it)
  transcript?: { by: string; text: string };   // what a model wrote down on hearing it
};
export type UseCase = {
  id: string;
  icon: IconName;
  photo?: { src: string; alt: string; credit: string; position?: string };
  title: string;
  body: string;
  voicings: Voicing[];           // the first, Zarma, is the one each card opens with
  note: string;                  // how the sound was made
  models: string[];
};

type Copy = { title: string; sub: string; partner: string; build: string; hear: string; hide: string; play: string; stop: string; voice: string; voiceN: (n: number) => string; models: string; cases: UseCase[] };

const n = " ";   // narrow no-break space before French high punctuation

/** Every case's voicings, in the menu's order: Zarma first. */
const VOICINGS: readonly { voice: VoiceId; lang: LangCode }[] = [
  { voice: "mouhamad", lang: "dje" }, { voice: "mouhamad", lang: "ha" }, { voice: "nadia", lang: "ha" }, { voice: "fr", lang: "fr" },
];
/** The voices' numbers in the menu ("Voice 1"): the page does not name the people behind them. */
export const VOICE_NUMBER: Partial<Record<VoiceId, number>> = { mouhamad: 1, nadia: 2, fr: 3 };

type CaseId = "education" | "health" | "translation" | "farming" | "public" | "heritage";

/* What is said, by case and language. Hausa is said by two voices alike. */
const SAID: Record<CaseId, Record<"dje" | "ha" | "fr", string>> = {
  education: {
    dje: "Zankey ga koy lokkol ka dondon caw nda hantum.",
    ha: "Yara suna zuwa makaranta domin su koyi karatu da rubutu.",
    fr: "Les enfants vont à l’école pour apprendre à lire et à écrire.",
  },
  health: {
    dje: "Nda ni izo gonda konni, ma a kondi loktoro kwara hunkuna.",
    ha: "Idan ɗanku yana da zazzaɓi, ku kai shi asibiti yau.",
    fr: "Si votre enfant a de la fièvre, emmenez-le au centre de santé aujourd’hui.",
  },
  translation: {
    dje: "Marje no mo taasa go hunkuna?",
    ha: "Nawa ne kwanon shinkafa yau?",
    fr: "Combien coûte le bol de riz aujourd’hui ?",
  },
  farming: {
    dje: "Hunkuna beene hirri. Suba hari ga kaŋ: wa hayni duma.",
    ha: "Yau akwai gajimare. Gobe za a yi ruwan sama: ku shuka gero.",
    fr: "Le ciel est nuageux aujourd’hui. Demain, il va pleuvoir : semez votre mil.",
  },
  public: {
    dje: "Fofo! Ifo no ni ga ba iri ma te ni se hunkuna?",
    ha: "Sannu! Me kuke so mu yi muku yau?",
    fr: "Bonjour ! Que pouvons-nous faire pour vous aujourd’hui ?",
  },
  heritage: {
    dje: "Kwara alberey ga deeda boobo bay.",
    ha: "Dattawan ƙauye sun san labarai da yawa.",
    fr: "Les anciens du village connaissent beaucoup d’histoires.",
  },
};

/* Kora's own output for the translation case's questions (POST /v1/translate through the site's live demo, with the
   speech it returned), and Tatsuniya's for the heritage clips (as /v1/transcribe returned them). */
const KORA = { toFr: "Combien coûte le bol de riz aujourd'hui ?", toHa: "Nawa ne kwanon shinkafa yau?" };
const HEARD: Partial<Record<VoiceId, string>> = {
  mouhamad: "dattawan kauye sun san labarai da yawa.",
  nadia: "dattawan ƙauye sun san labarai da yawa.",
};

const said = (c: CaseId, voice: VoiceId, lang: "dje" | "ha" | "fr", by = "Tafiya"): Clip =>
  ({ src: `/usecases/${c}/${voice}-${lang}.m4a`, text: SAID[c][lang], lang, by });

/* What follows a translation question: Kora's translation from Hausa (into French) and from French (into Hausa);
   for Zarma, the French line, said by Tafiya's French voice. */
const answer = (voice: VoiceId, lang: "dje" | "ha" | "fr"): Clip =>
  lang === "ha" ? { src: `/usecases/translation/${voice}-ha.kora-fr.m4a`, text: KORA.toFr, lang: "fr", by: "Kora" }
  : lang === "fr" ? { src: "/usecases/translation/fr-fr.kora-ha.m4a", text: KORA.toHa, lang: "ha", by: "Kora" }
  : { src: "/usecases/translation/fr-fr.m4a", text: SAID.translation.fr, lang: "fr", by: "Tafiya" };

/** A case in every voicing. `gloss` is its meaning in the page's language, by the language said (`all` for any);
    a French page gives none where a clip already says it in French. */
const voicings = (c: CaseId, gloss: Partial<Record<"all" | "dje" | "ha" | "fr", string>>): Voicing[] =>
  VOICINGS.map(({ voice, lang }) => {
    const l = lang as "dje" | "ha" | "fr";
    return {
      voice, lang,
      clips: c === "translation" ? [said(c, voice, l), answer(voice, l)] : [said(c, voice, l)],
      gloss: (l in gloss ? gloss[l] : gloss.all) ?? "",
      ...(c === "heritage" && HEARD[voice] && l === "ha" ? { transcript: { by: "Tatsuniya", text: HEARD[voice]! } } : {}),
    };
  });

export const useCases: Record<Lang, Copy> = {
  en: {
    title: "Use cases", sub: "What people can build when technology speaks their language",
    partner: "Partner with us", build: "Start building", hear: "Hear it", hide: "Close", play: "Play", stop: "Stop",
    voice: "Voice", voiceN: k => `Voice ${k}`, models: "Built on",
    cases: [
      { id: "education", icon: "learn", title: "Education & learning", models: ["Aïr", "Tafiya"],
        voicings: voicings("education", { all: "Children go to school to learn to read and write." }),
        body: "Build voice-powered tutors that explain lessons, answer questions, and help people learn in their own languages, anytime and anywhere.",
        note: "A tutor’s voice, spoken by Tafiya." },
      { id: "health", icon: "care", title: "Healthcare", models: ["Aïr", "Tafiya"],
        voicings: voicings("health", { all: "If your child has a fever, take them to the clinic today." }),
        body: "Make healthcare more accessible with voice assistants that provide trusted health information, answer questions, and connect people to care in their local languages.",
        note: "A clinic’s advice, spoken by Tafiya." },
      { id: "translation", icon: "translate", title: "Real-time translation", models: ["Kora"],
        voicings: voicings("translation", { all: "How much is a bowl of rice today?" }),
        body: "Break language barriers with AI that translates spoken conversations in real time, allowing people to communicate naturally across languages.",
        note: "A question, then its translation, heard and spoken by the models." },
      { id: "farming", icon: "grow", title: "Agriculture & farming", models: ["Aïr", "Tafiya"],
        voicings: voicings("farming", { all: "The sky is cloudy today. Rain will fall tomorrow: sow your millet.", ha: "There are clouds today. Rain will fall tomorrow: sow your millet." }),
        body: "Help farmers and pastoralists access weather updates, agricultural advice, livestock information, and market prices through simple voice conversations.",
        note: "A weather update for farmers, spoken by Tafiya." },
      { id: "public", icon: "civic", title: "Public services", models: ["Aïr", "Tafiya"],
        voicings: voicings("public", { all: "Hello! What can we do for you today?" }),
        body: "Make public services easier to access with voice assistants that explain procedures, answer questions, and guide people through essential services in their own languages.",
        note: "A service desk’s welcome, spoken by Tafiya." },
      { id: "heritage", icon: "transcript", title: "Oral heritage & preservation", models: ["Tatsuniya"],
        voicings: voicings("heritage", { all: "The village elders know many stories." }),
        body: "Preserve oral histories, traditional knowledge, and local languages by turning spoken stories into accessible, interactive digital archives.",
        note: "Spoken by Tafiya, and in Hausa, what Tatsuniya wrote down when it heard it." },
    ],
  },
  fr: {
    title: "Cas d’usage", sub: "Ce que l’on peut construire quand la technologie parle votre langue",
    partner: "Devenez partenaire", build: "Commencer à construire", hear: "Écouter", hide: "Fermer", play: "Lire", stop: "Arrêter",
    voice: "Voix", voiceN: k => `Voix ${k}`, models: "Construit avec",
    cases: [
      { id: "education", icon: "learn", title: "Éducation et apprentissage", models: ["Aïr", "Tafiya"],
        voicings: voicings("education", { all: "Les enfants vont à l’école pour apprendre à lire et à écrire.", fr: "" }),
        body: "Créez des tuteurs vocaux qui expliquent les leçons, répondent aux questions et aident chacun à apprendre dans sa langue, à tout moment et partout.",
        note: "La voix d’un tuteur, prononcée par Tafiya." },
      { id: "health", icon: "care", title: "Santé", models: ["Aïr", "Tafiya"],
        voicings: voicings("health", { all: "Si votre enfant a de la fièvre, emmenez-le au centre de santé aujourd’hui.", fr: "" }),
        body: "Rendez la santé plus accessible avec des assistants vocaux qui donnent des informations fiables, répondent aux questions et orientent vers les soins dans les langues locales.",
        note: "Le conseil d’un centre de santé, prononcé par Tafiya." },
      { id: "translation", icon: "translate", title: "Traduction en temps réel", models: ["Kora"],
        voicings: voicings("translation", {}),
        body: "Levez les barrières de la langue avec une IA qui traduit les conversations orales en temps réel, pour que chacun se parle naturellement d’une langue à l’autre.",
        note: "Une question, puis sa traduction, entendue et prononcée par les modèles." },
      { id: "farming", icon: "grow", title: "Agriculture et élevage", models: ["Aïr", "Tafiya"],
        voicings: voicings("farming", { all: `Le ciel est nuageux aujourd’hui. Demain, il va pleuvoir${n}: semez votre mil.`, ha: `Il y a des nuages aujourd’hui. Demain, il va pleuvoir${n}: semez votre mil.`, fr: "" }),
        body: "Donnez aux agriculteurs et aux éleveurs accès à la météo, aux conseils agricoles, aux informations sur le bétail et aux prix du marché, par une simple conversation.",
        note: "La météo pour les agriculteurs, prononcée par Tafiya." },
      { id: "public", icon: "civic", title: "Services publics", models: ["Aïr", "Tafiya"],
        voicings: voicings("public", { all: `Bonjour${n}! Que pouvons-nous faire pour vous aujourd’hui${n}?`, fr: "" }),
        body: "Facilitez l’accès aux services publics avec des assistants vocaux qui expliquent les démarches, répondent aux questions et guident chacun dans sa langue.",
        note: "L’accueil d’un guichet, prononcé par Tafiya." },
      { id: "heritage", icon: "transcript", title: "Patrimoine oral", models: ["Tatsuniya"],
        voicings: voicings("heritage", { all: "Les anciens du village connaissent beaucoup d’histoires.", fr: "" }),
        body: "Préservez les histoires orales, les savoirs traditionnels et les langues locales en transformant la parole en archives numériques accessibles et interactives.",
        note: "Prononcé par Tafiya et, en haoussa, ce que Tatsuniya en a écrit en l’entendant." },
    ],
  },
};
