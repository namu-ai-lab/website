import type { Lang } from "@/i18n/config";
import type { IconName } from "@/lib/icons";

/* The home page's use cases, after openai.com's "Use cases driven by our platform": six things people can build with
   the Lab's models, each with a photograph of the people it is for. Where openai.com opens a list of customer
   stories, these open what the use case sounds like: one line in Hausa, spoken by the Lab's own models (recorded
   through the API, public/usecases/README.md), its translation, and the models it would be built on. The Hausa is
   to be checked by a native speaker. */

export type Clip = { src: string; text: string; lang: "ha" | "fr"; by: string };
export type UseCase = {
  id: string;
  icon: IconName;
  photo?: { src: string; alt: string; credit: string; position?: string };
  title: string;
  body: string;
  clips: Clip[];                 // played one after the other
  gloss: string;                 // what it says, in the page's language (empty when a clip already says it)
  transcript?: { by: string; text: string };   // what a model wrote down on hearing it
  note: string;                  // how the sound was made
  models: string[];
};

type Copy = { title: string; sub: string; partner: string; build: string; hear: string; hide: string; play: string; stop: string; models: string; cases: UseCase[] };

const n = " ";   // narrow no-break space before French high punctuation

const HA = {
  education: "Bari mu koyi ƙidaya tare: ɗaya, biyu, uku, huɗu, biyar.",
  health: "Kar ki manta, gobe da safe ki kawo jaririnki asibiti don allurar rigakafi.",
  translation: "Nawa ne farashin buhun gero?",
  farming: "Damina ta kama. Lokaci ya yi da manoma su fara shuka gero da dawa.",
  public: "Za mu taimaka muku ku cike fom ɗin, mataki-mataki.",
  heritage: "Wata rana, a wani ƙauye, akwai wani tsoho mai ba da labari.",
};
const FR_TRANSLATION = "Quel est le prix du sac de mil ?";   // Kora's own output

/* Tatsuniya's transcript of the heritage clip, as it came back from /v1/transcribe */
const HEARD = { by: "Tatsuniya", text: "wata rana a wani ƙauye akwai wani tsoho mai bada labari." };

const clips = {
  education: [{ src: "/usecases/education.m4a", text: HA.education, lang: "ha", by: "Tafiya" }],
  health: [{ src: "/demo/clinic-nadia.m4a", text: HA.health, lang: "ha", by: "Tafiya" }],
  translation: [{ src: "/usecases/translation-ha.m4a", text: HA.translation, lang: "ha", by: "Tafiya" }, { src: "/usecases/translation-fr.m4a", text: FR_TRANSLATION, lang: "fr", by: "Kora" }],
  farming: [{ src: "/demo/farm-salim.m4a", text: HA.farming, lang: "ha", by: "Tafiya" }],
  public: [{ src: "/usecases/public.m4a", text: HA.public, lang: "ha", by: "Tafiya" }],
  heritage: [{ src: "/usecases/heritage.m4a", text: HA.heritage, lang: "ha", by: "Tafiya" }],
} satisfies Record<string, Clip[]>;

export const useCases: Record<Lang, Copy> = {
  en: {
    title: "Use cases", sub: "What people can build when technology speaks their language",
    partner: "Partner with us", build: "Start building", hear: "Hear it", hide: "Close", play: "Play", stop: "Stop", models: "Built on",
    cases: [
      { id: "education", icon: "learn", title: "Education & learning", models: ["Aïr", "Tafiya"], clips: clips.education,
        body: "Build voice-powered tutors that explain lessons, answer questions, and help people learn in their own languages, anytime and anywhere.",
        gloss: "Let’s learn to count together: one, two, three, four, five.", note: "A tutor’s voice, spoken by Tafiya." },
      { id: "health", icon: "care", title: "Healthcare", models: ["Aïr", "Tafiya"], clips: clips.health,
        body: "Make healthcare more accessible with voice assistants that provide trusted health information, answer questions, and connect people to care in their local languages.",
        gloss: "Don’t forget: tomorrow morning, bring your baby to the clinic for the vaccination.", note: "A clinic’s reminder, spoken by Tafiya." },
      { id: "translation", icon: "translate", title: "Real-time translation", models: ["Kora"], clips: clips.translation,
        body: "Break language barriers with AI that translates spoken conversations in real time, allowing people to communicate naturally across languages.",
        gloss: "How much is a sack of millet?", note: "A question in Hausa, then Kora’s own translation into French, heard and spoken by the model." },
      { id: "farming", icon: "grow", title: "Agriculture & farming", models: ["Aïr", "Tafiya"], clips: clips.farming,
        body: "Help farmers and pastoralists access weather updates, agricultural advice, livestock information, and market prices through simple voice conversations.",
        gloss: "The rainy season has set in. It is time for farmers to start sowing millet and sorghum.", note: "Advice for the season, spoken by Tafiya." },
      { id: "public", icon: "civic", title: "Public services", models: ["Aïr", "Tafiya"], clips: clips.public,
        body: "Make public services easier to access with voice assistants that explain procedures, answer questions, and guide people through essential services in their own languages.",
        gloss: "We will help you fill in the form, step by step.", note: "A service desk’s voice, spoken by Tafiya." },
      { id: "heritage", icon: "transcript", title: "Oral heritage & preservation", models: ["Tatsuniya"], clips: clips.heritage,
        body: "Preserve oral histories, traditional knowledge, and local languages by turning spoken stories into accessible, interactive digital archives.",
        gloss: "Once, in a village, there lived an old storyteller.", note: "The opening of a story, spoken by Tafiya, and what Tatsuniya wrote down when it heard it.", transcript: HEARD },
    ],
  },
  fr: {
    title: "Cas d’usage", sub: "Ce que l’on peut construire quand la technologie parle votre langue",
    partner: "Devenez partenaire", build: "Commencer à construire", hear: "Écouter", hide: "Fermer", play: "Lire", stop: "Arrêter", models: "Construit avec",
    cases: [
      { id: "education", icon: "learn", title: "Éducation et apprentissage", models: ["Aïr", "Tafiya"], clips: clips.education,
        body: "Créez des tuteurs vocaux qui expliquent les leçons, répondent aux questions et aident chacun à apprendre dans sa langue, à tout moment et partout.",
        gloss: `Apprenons à compter ensemble${n}: un, deux, trois, quatre, cinq.`, note: "La voix d’un tuteur, prononcée par Tafiya." },
      { id: "health", icon: "care", title: "Santé", models: ["Aïr", "Tafiya"], clips: clips.health,
        body: "Rendez la santé plus accessible avec des assistants vocaux qui donnent des informations fiables, répondent aux questions et orientent vers les soins dans les langues locales.",
        gloss: `N’oubliez pas${n}: demain matin, amenez votre bébé au centre de santé pour la vaccination.`, note: "Le rappel d’un centre de santé, prononcé par Tafiya." },
      { id: "translation", icon: "translate", title: "Traduction en temps réel", models: ["Kora"], clips: clips.translation,
        body: "Levez les barrières de la langue avec une IA qui traduit les conversations orales en temps réel, pour que chacun se parle naturellement d’une langue à l’autre.",
        gloss: "", note: "Une question en haoussa, puis la traduction de Kora en français, entendue et prononcée par le modèle." },
      { id: "farming", icon: "grow", title: "Agriculture et élevage", models: ["Aïr", "Tafiya"], clips: clips.farming,
        body: "Donnez aux agriculteurs et aux éleveurs accès à la météo, aux conseils agricoles, aux informations sur le bétail et aux prix du marché, par une simple conversation.",
        gloss: "La saison des pluies s’est installée. Il est temps pour les agriculteurs de semer le mil et le sorgho.", note: "Un conseil de saison, prononcé par Tafiya." },
      { id: "public", icon: "civic", title: "Services publics", models: ["Aïr", "Tafiya"], clips: clips.public,
        body: "Facilitez l’accès aux services publics avec des assistants vocaux qui expliquent les démarches, répondent aux questions et guident chacun dans sa langue.",
        gloss: "Nous vous aidons à remplir le formulaire, étape par étape.", note: "La voix d’un guichet, prononcée par Tafiya." },
      { id: "heritage", icon: "transcript", title: "Patrimoine oral", models: ["Tatsuniya"], clips: clips.heritage,
        body: "Préservez les histoires orales, les savoirs traditionnels et les langues locales en transformant la parole en archives numériques accessibles et interactives.",
        gloss: "Il était une fois, dans un village, un vieux conteur.", note: "Le début d’un conte, prononcé par Tafiya, et ce que Tatsuniya en a écrit en l’entendant.", transcript: HEARD },
    ],
  },
};
