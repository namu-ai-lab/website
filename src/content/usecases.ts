import type { Lang } from "@/i18n/config";
import type { IconName } from "@/lib/icons";
import type { LangCode, VoiceId } from "@/lib/catalog";

/* The home page's use cases, after openai.com's "Use cases driven by our platform": six things people can build with
   the Lab's models, each with a photograph of the people it is for. Where openai.com opens a list of customer
   stories, these open what the use case sounds like, in each of the platform's voices: the same line said by Nadia in
   Hausa, by Mouhamad in Hausa and in Zarma, and by the French voice, each recorded through the Lab's own models
   (public/usecases/README.md), with its meaning and the models it would be built on. A case offers the voices its
   models can carry: Kora translates between Hausa and French, Tatsuniya writes down Hausa.

   The lines were written to be said well by every voice (short, no figures, everyday words), and each recording is
   the take a speech recogniser read back most faithfully. The Zarma follows the 1999 alphabet (zarma-exploration
   langs/dje). NATIVE-REVIEW: the Zarma lines wait for a native speaker's check; the Hausa is to be checked again. */

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
  voicings: Voicing[];           // the first is the one each card opens with
  note: string;                  // how the sound was made
  models: string[];
};

type Copy = { title: string; sub: string; partner: string; build: string; hear: string; hide: string; play: string; stop: string; voice: string; models: string; cases: UseCase[] };

const n = " ";   // narrow no-break space before French high punctuation

/* What each voice says, by case. Hausa is said by Nadia and Mouhamad alike. */
const SAID = {
  education: {
    ha: "Sannu da zuwa, yara! Yau za mu koyi karatu tare. Ku saurara da kyau, sannan ku maimaita bayana.",
    dje: "Fofo, zankey! Hunkuna iri ga tira caw cere banda. Wa hangan ay se!",
    fr: "Bonjour les enfants ! Aujourd’hui, nous apprenons à lire ensemble. Écoutez bien, puis répétez après moi.",
  },
  health: {
    ha: "Kar ki manta: gobe da safe, ki kawo jaririnki asibiti don allurar rigakafi.",
    dje: "Ma si dirgan: suba susubay, ni ma kande ni izo loktoro kwara.",
    fr: "N’oubliez pas : demain matin, amenez votre bébé au centre de santé pour la vaccination.",
  },
  translation: {
    ha: "Sannu! Nawa ne farashin buhun gero a kasuwa yau?",
    fr: "Bonjour ! Combien coûte le sac de mil au marché aujourd’hui ?",
  },
  farming: {
    ha: "Damina ta kama. Lokaci ya yi da manoma su fara shuka gero da dawa.",
    dje: "Beene haro kaŋ. Sohõ, alfarey ma hayni nda hamo duma.",
    fr: "La saison des pluies est arrivée. C’est le moment de semer le mil et le sorgho.",
  },
  public: {
    ha: "Sannu da zuwa. Za mu taimaka muku ku cike fom ɗinku, mataki-mataki.",
    dje: "Fofo! Iri ga ni faaba nda ni tira.",
    fr: "Bienvenue. Nous allons vous aider à remplir votre formulaire, étape par étape.",
  },
  heritage: {
    ha: "Wata rana, a wani ƙauye, akwai wani tsoho mai ba da labari. Kowa yana son jin labaransa.",
  },
};

/* Kora's own output for the translation case's questions (POST /v1/translate through the site's live demo, with the
   speech it returned), and Tatsuniya's for the heritage clips (as /v1/transcribe returned them). */
const KORA = {
  toFr: "Bonjour, quel est le prix du sac de mil au marché aujourd'hui ?",
  toHa: "Sannu, nawa ne farashin buhun gero a kasuwa a yau?",
};
const HEARD = {
  nadia: "wata rana, a wani ƙauye, akwai wani tsoho mai ba da labari kowa yana son jin labaransa.",
  mouhamad: "wata rana a wani ƙauye akwai wani tsoho mai ba da labari, kowa yana son jin labaransa.",
};

const said = (c: keyof typeof SAID, voice: VoiceId, lang: LangCode, by = "Tafiya"): Clip =>
  ({ src: `/usecases/${c}/${voice}-${lang}.m4a`, text: (SAID[c] as Partial<Record<LangCode, string>>)[lang]!, lang, by });

/* The voicings of a case said by Tafiya alone: every voice, Hausa first. `gloss` gives the meaning of each language's
   line in the page's language. */
type Gloss = Partial<Record<LangCode, string>>;
const spoken = (c: keyof typeof SAID, gloss: Gloss): Voicing[] => [
  { voice: "nadia", lang: "ha", clips: [said(c, "nadia", "ha")], gloss: gloss.ha ?? "" },
  { voice: "mouhamad", lang: "ha", clips: [said(c, "mouhamad", "ha")], gloss: gloss.ha ?? "" },
  ...("dje" in SAID[c] ? [{ voice: "mouhamad", lang: "dje", clips: [said(c, "mouhamad", "dje")], gloss: gloss.dje ?? "" } as Voicing] : []),
  ...("fr" in SAID[c] ? [{ voice: "fr", lang: "fr", clips: [said(c, "fr", "fr")], gloss: gloss.fr ?? "" } as Voicing] : []),
];

/* Translation: a question, then Kora's translation of it, spoken by Kora. Hausa to French, or French to Hausa. */
const translation = (gloss: { question: string; frPage: boolean }): Voicing[] => [
  ...(["nadia", "mouhamad"] as const).map(v => ({
    voice: v, lang: "ha" as const, gloss: gloss.frPage ? "" : gloss.question,
    clips: [said("translation", v, "ha"), { src: `/usecases/translation/${v}-ha.kora-fr.m4a`, text: KORA.toFr, lang: "fr" as const, by: "Kora" }],
  })),
  { voice: "fr", lang: "fr", gloss: gloss.frPage ? "" : gloss.question,
    clips: [said("translation", "fr", "fr"), { src: "/usecases/translation/fr-fr.kora-ha.m4a", text: KORA.toHa, lang: "ha", by: "Kora" }] },
];

/* Heritage: the opening of a story in Hausa, and what Tatsuniya wrote down on hearing it. */
const heritage = (gloss: string): Voicing[] => (["nadia", "mouhamad"] as const).map(v => ({
  voice: v, lang: "ha", clips: [said("heritage", v, "ha")], gloss, transcript: { by: "Tatsuniya", text: HEARD[v] },
}));

export const useCases: Record<Lang, Copy> = {
  en: {
    title: "Use cases", sub: "What people can build when technology speaks their language",
    partner: "Partner with us", build: "Start building", hear: "Hear it", hide: "Close", play: "Play", stop: "Stop", voice: "Voice", models: "Built on",
    cases: [
      { id: "education", icon: "learn", title: "Education & learning", models: ["Aïr", "Tafiya"],
        voicings: spoken("education", {
          ha: "Welcome, children! Today we will learn to read together. Listen carefully, then repeat after me.",
          dje: "Hello, children! Today we will read together. Listen to me!",
          fr: "Hello, children! Today we are learning to read together. Listen carefully, then repeat after me." }),
        body: "Build voice-powered tutors that explain lessons, answer questions, and help people learn in their own languages, anytime and anywhere.",
        note: "A tutor’s voice, spoken by Tafiya." },
      { id: "health", icon: "care", title: "Healthcare", models: ["Aïr", "Tafiya"],
        voicings: spoken("health", {
          ha: "Don’t forget: tomorrow morning, bring your baby to the clinic for the vaccination.",
          dje: "Don’t forget: tomorrow morning, bring your child to the clinic.",
          fr: "Don’t forget: tomorrow morning, bring your baby to the health centre for the vaccination." }),
        body: "Make healthcare more accessible with voice assistants that provide trusted health information, answer questions, and connect people to care in their local languages.",
        note: "A clinic’s reminder, spoken by Tafiya." },
      { id: "translation", icon: "translate", title: "Real-time translation", models: ["Kora"],
        voicings: translation({ question: "Hello! How much is a sack of millet at the market today?", frPage: false }),
        body: "Break language barriers with AI that translates spoken conversations in real time, allowing people to communicate naturally across languages.",
        note: "A question, then Kora’s own translation of it, heard and spoken by the model." },
      { id: "farming", icon: "grow", title: "Agriculture & farming", models: ["Aïr", "Tafiya"],
        voicings: spoken("farming", {
          ha: "The rainy season has set in. It is time for farmers to start sowing millet and sorghum.",
          dje: "The rain has fallen. Now, farmers should sow millet and sorghum.",
          fr: "The rainy season has come. It is time to sow millet and sorghum." }),
        body: "Help farmers and pastoralists access weather updates, agricultural advice, livestock information, and market prices through simple voice conversations.",
        note: "Advice for the season, spoken by Tafiya." },
      { id: "public", icon: "civic", title: "Public services", models: ["Aïr", "Tafiya"],
        voicings: spoken("public", {
          ha: "Welcome. We will help you fill in your form, step by step.",
          dje: "Hello! We will help you with your papers.",
          fr: "Welcome. We will help you fill in your form, step by step." }),
        body: "Make public services easier to access with voice assistants that explain procedures, answer questions, and guide people through essential services in their own languages.",
        note: "A service desk’s voice, spoken by Tafiya." },
      { id: "heritage", icon: "transcript", title: "Oral heritage & preservation", models: ["Tatsuniya"],
        voicings: heritage("Once, in a village, there lived an old storyteller. Everyone loved to hear his stories."),
        body: "Preserve oral histories, traditional knowledge, and local languages by turning spoken stories into accessible, interactive digital archives.",
        note: "The opening of a story, spoken by Tafiya, and what Tatsuniya wrote down when it heard it." },
    ],
  },
  fr: {
    title: "Cas d’usage", sub: "Ce que l’on peut construire quand la technologie parle votre langue",
    partner: "Devenez partenaire", build: "Commencer à construire", hear: "Écouter", hide: "Fermer", play: "Lire", stop: "Arrêter", voice: "Voix", models: "Construit avec",
    cases: [
      { id: "education", icon: "learn", title: "Éducation et apprentissage", models: ["Aïr", "Tafiya"],
        voicings: spoken("education", {
          ha: `Bienvenue, les enfants${n}! Aujourd’hui, nous apprenons à lire ensemble. Écoutez bien, puis répétez après moi.`,
          dje: `Bonjour, les enfants${n}! Aujourd’hui, nous lisons ensemble. Écoutez-moi${n}!` }),
        body: "Créez des tuteurs vocaux qui expliquent les leçons, répondent aux questions et aident chacun à apprendre dans sa langue, à tout moment et partout.",
        note: "La voix d’un tuteur, prononcée par Tafiya." },
      { id: "health", icon: "care", title: "Santé", models: ["Aïr", "Tafiya"],
        voicings: spoken("health", {
          ha: `N’oubliez pas${n}: demain matin, amenez votre bébé au centre de santé pour la vaccination.`,
          dje: `N’oubliez pas${n}: demain matin, amenez votre enfant au centre de santé.` }),
        body: "Rendez la santé plus accessible avec des assistants vocaux qui donnent des informations fiables, répondent aux questions et orientent vers les soins dans les langues locales.",
        note: "Le rappel d’un centre de santé, prononcé par Tafiya." },
      { id: "translation", icon: "translate", title: "Traduction en temps réel", models: ["Kora"],
        voicings: translation({ question: "", frPage: true }),
        body: "Levez les barrières de la langue avec une IA qui traduit les conversations orales en temps réel, pour que chacun se parle naturellement d’une langue à l’autre.",
        note: "Une question, puis la traduction qu’en fait Kora, entendue et prononcée par le modèle." },
      { id: "farming", icon: "grow", title: "Agriculture et élevage", models: ["Aïr", "Tafiya"],
        voicings: spoken("farming", {
          ha: "La saison des pluies s’est installée. Il est temps pour les agriculteurs de semer le mil et le sorgho.",
          dje: "La pluie est tombée. Maintenant, les agriculteurs doivent semer le mil et le sorgho." }),
        body: "Donnez aux agriculteurs et aux éleveurs accès à la météo, aux conseils agricoles, aux informations sur le bétail et aux prix du marché, par une simple conversation.",
        note: "Un conseil de saison, prononcé par Tafiya." },
      { id: "public", icon: "civic", title: "Services publics", models: ["Aïr", "Tafiya"],
        voicings: spoken("public", {
          ha: "Bienvenue. Nous allons vous aider à remplir votre formulaire, étape par étape.",
          dje: `Bonjour${n}! Nous allons vous aider avec vos papiers.` }),
        body: "Facilitez l’accès aux services publics avec des assistants vocaux qui expliquent les démarches, répondent aux questions et guident chacun dans sa langue.",
        note: "La voix d’un guichet, prononcée par Tafiya." },
      { id: "heritage", icon: "transcript", title: "Patrimoine oral", models: ["Tatsuniya"],
        voicings: heritage("Il était une fois, dans un village, un vieux conteur. Tout le monde aimait écouter ses histoires."),
        body: "Préservez les histoires orales, les savoirs traditionnels et les langues locales en transformant la parole en archives numériques accessibles et interactives.",
        note: "Le début d’un conte, prononcé par Tafiya, et ce que Tatsuniya en a écrit en l’entendant." },
    ],
  },
};
