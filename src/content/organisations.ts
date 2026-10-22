/* The Organisations page (/organisations), after openaifoundation.org: the mark, a name and a mission; one statement
   beside one large photograph; the work we do with organisations as cards; resources; and the way to reach us.
   The cards are the use cases organisations bring to the Lab, open-ended (no count is given, and the last line asks
   for others). Each plays a line spoken by the Lab's own models, the same recordings as the home page's use cases
   (content/usecases.ts), so nothing here is a mock-up.
   The photographs are freely licensed, from Wikimedia Commons (public/organisations/CREDITS.md); they show the region
   and the kind of work, not the Lab's partners.
   Claims gate: no partners, pilots, customers or deployments are named or implied; the cards are where speech
   technology can help, and the Lab offers to work on them. FR-REVIEW: drafted French, to be reviewed by a native
   speaker. */
import type { Lang } from "@/i18n/config";

const n = " ";   // narrow no-break space before French high punctuation

/* id is the use case whose clip the card plays (content/usecases.ts) */
export type OrgArea = { id: "health" | "farming" | "education" | "public" | "translation" | "heritage"; t: string; d: string; alt: string };

export type OrgCopy = {
  meta: [string, string];
  h1: string; mission: string;
  statement: string; statementAlt: string; partner: string;
  areasH: string; areas: OrgArea[]; hear: string; stop: string; heard: string;
  moreQ: string; moreCta: string;
  resourcesH: string; programme: string;
  endH: string; endSub: string; write: string;
};

/* Where each photograph comes from (public/organisations/CREDITS.md) */
export const ORG_PHOTOS: Record<"statement" | OrgArea["id"], { src: string; author: string; licence: string; file: string; licenceUrl?: string }> = {
  statement: { src: "/organisations/statement.jpg", author: "USAID in Africa", licence: "public domain", file: "https://commons.wikimedia.org/wiki/File:Niger_Maradi_%26_Zinder_(17577503943).jpg" },
  health: { src: "/organisations/health.jpg", author: "CDC Global", licence: "CC BY 2.0", licenceUrl: "https://creativecommons.org/licenses/by/2.0/", file: "https://commons.wikimedia.org/wiki/File:Marking_figures_of_children_who_received_polio_vaccine_(34332436140).jpg" },
  farming: { src: "/organisations/farming.jpg", author: "USAID/CRS", licence: "public domain", file: "https://commons.wikimedia.org/wiki/File:Niger_seed_fair_Zinder_Region_2006_USAID.jpg" },
  education: { src: "/organisations/learning.jpg", author: "USAID in Africa", licence: "public domain", file: "https://commons.wikimedia.org/wiki/File:Niger_Maradi_%26_Zinder_(18199280551).jpg" },
  public: { src: "/organisations/public.jpg", author: "USAID in Africa", licence: "public domain", file: "https://commons.wikimedia.org/wiki/File:Niger_Maradi_%26_Zinder_(18198103525).jpg" },
  translation: { src: "/organisations/markets.jpg", author: "Sasu photography", licence: "CC BY-SA 4.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/", file: "https://commons.wikimedia.org/wiki/File:Trader_selling_pepper_2025.jpg" },
  heritage: { src: "/organisations/heritage.jpg", author: "Mark Fischer", licence: "CC BY-SA 2.0", licenceUrl: "https://creativecommons.org/licenses/by-sa/2.0/", file: "https://commons.wikimedia.org/wiki/File:Timbuktu_Manuscript_(48522180467).jpg" },
};

const en: OrgCopy = {
  meta: ["Organisations", "Work with Namu AI Lab on speech technology for the languages of the Sahel: health, farming, learning, public services, trade and heritage, in the languages people speak."],
  h1: "Namu for organisations",
  mission: "Our mission is to make speech technology work for every language of the Sahel.",
  statement: "Voice can carry health advice, farming knowledge and public services to people who have never been served in their own language. Doing it well means building with the people it is for, with their consent, and measuring it honestly. We work with organisations to do both.",
  statementAlt: "A woman in a blue headscarf, smiling, in southern Niger.",
  partner: "Partner with us",
  areasH: "We work with organisations wherever people are better served in their own language",
  areas: [
    { id: "health", t: "Health and care", alt: "Health workers in Nigeria mark a child’s finger after a polio vaccination.",
      d: "Reminders and advice people can hear and answer in their own language, by phone or through community health workers." },
    { id: "farming", t: "Farming and food", alt: "Farmers measure out seed at a seed fair in the Zinder region of Niger.",
      d: "Weather, planting and market information spoken in the languages farmers use, by radio, by phone or through field staff." },
    { id: "education", t: "Learning and literacy", alt: "A woman writes Hausa words on a blackboard, a mobile phone in her hand, in southern Niger.",
      d: "Lessons anyone can follow by listening, and help with reading and writing in their own language." },
    { id: "public", t: "Public services and communities", alt: "Women sit together at a community meeting in southern Niger.",
      d: "Forms, rights and public information explained aloud, at a service desk, on a phone line or at a community meeting." },
    { id: "translation", t: "Trade and markets", alt: "A trader counts money beside her stall of peppers.",
      d: "Buyers and sellers who speak different languages, understood through speech translation." },
    { id: "heritage", t: "Heritage and archives", alt: "Hands turn the pages of an old manuscript from Timbuktu.",
      d: "Stories, recordings and archives written down and kept, so what was said can be searched and passed on." },
  ],
  hear: "Hear an example", stop: "Stop", heard: "What Tatsuniya wrote down",
  moreQ: "Working on something else?", moreCta: "Tell us about it",
  resourcesH: "Resources", programme: "Research programme",
  endH: "Work with us",
  endSub: "Tell us who you serve, the languages they speak and what you would like to do.",
  write: "Write to us",
};

const frCopy: OrgCopy = {
  meta: ["Organisations", `Travaillez avec Namu AI Lab sur les technologies de la parole pour les langues du Sahel${n}: santé, agriculture, apprentissage, services publics, commerce et patrimoine, dans les langues que les gens parlent.`],
  h1: "Namu pour les organisations",
  mission: "Notre mission est de faire fonctionner les technologies de la parole pour chaque langue du Sahel.",
  statement: "La voix peut porter des conseils de santé, des savoirs agricoles et des services publics jusqu’à des personnes qui n’ont jamais été servies dans leur propre langue. Bien le faire, c’est construire avec les personnes concernées, avec leur consentement, et mesurer honnêtement. Nous travaillons avec les organisations pour faire les deux.",
  statementAlt: "Une femme au foulard bleu, souriante, dans le sud du Niger.",
  partner: "Devenir partenaire",
  areasH: "Nous travaillons avec les organisations partout où l’on sert mieux les gens dans leur propre langue",
  areas: [
    { id: "health", t: "Santé et soins", alt: "Au Nigeria, des agents de santé marquent le doigt d’un enfant après une vaccination contre la polio.",
      d: "Des rappels et des conseils que chacun peut écouter, et auxquels il peut répondre, dans sa langue, par téléphone ou par les agents de santé communautaires." },
    { id: "farming", t: "Agriculture et alimentation", alt: "Des agriculteurs mesurent des semences lors d’une foire aux semences dans la région de Zinder, au Niger.",
      d: "La météo, les semis et les prix du marché, dits dans les langues des agriculteurs, à la radio, au téléphone ou par les agents de terrain." },
    { id: "education", t: "Apprentissage et alphabétisation", alt: "Une femme écrit des mots en haoussa au tableau, un téléphone à la main, dans le sud du Niger.",
      d: "Des leçons que chacun peut suivre en écoutant, et une aide pour lire et écrire dans sa propre langue." },
    { id: "public", t: "Services publics et communautés", alt: "Des femmes réunies lors d’une assemblée communautaire dans le sud du Niger.",
      d: "Des formulaires, des droits et des informations publiques expliqués à voix haute, au guichet, au téléphone ou en réunion communautaire." },
    { id: "translation", t: "Commerce et marchés", alt: "Une commerçante compte de l’argent près de son étal de piments.",
      d: "Des acheteurs et des vendeurs qui ne parlent pas la même langue, et qui se comprennent grâce à la traduction de la parole." },
    { id: "heritage", t: "Patrimoine et archives", alt: "Des mains tournent les pages d’un ancien manuscrit de Tombouctou.",
      d: "Des récits, des enregistrements et des archives transcrits et conservés, pour que ce qui a été dit puisse être retrouvé et transmis." },
  ],
  hear: "Écouter un exemple", stop: "Arrêter", heard: "Ce que Tatsuniya a écrit",
  moreQ: `Vous travaillez sur autre chose${n}?`, moreCta: "Parlez-nous-en",
  resourcesH: "Ressources", programme: "Programme de recherche",
  endH: "Travaillons ensemble",
  endSub: "Dites-nous qui vous servez, les langues qu’ils parlent et ce que vous souhaitez faire.",
  write: "Nous écrire",
};

export const orgCopy: Record<Lang, OrgCopy> = { en, fr: frCopy };
