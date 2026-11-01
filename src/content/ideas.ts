/* Create's ideas: messages organisations in the Sahel send, by sector, written in French the way they would write
   them. "Use" puts the French in the box; Namu says it in the local language. Where Tafiya has already said one, its
   Hausa and the recording are real (public/demo and public/usecases, made through the API; the founder checked the
   Hausa). Each sector has a photograph from the Lab's licensed set (public/organisations/CREDITS.md).
   Scenes of use are examples, not running deployments. French read and approved by the founder on 2026-11-01. */
import type { Lang } from "@/i18n/config";

const n = " ";   // narrow no-break space before French high punctuation and inside numbers
const h = " ";   // no-break space before "h" in times

export type SectorId = "health" | "farming" | "learning" | "public" | "markets" | "stories";
export type Sector = { id: SectorId; photo: string; name: Record<Lang, string> };
export type Idea = {
  id: string; sector: SectorId; title: Record<Lang, string>; fr: string;
  /** the Hausa Tafiya said, and its recording per voice, where there is one */
  ha?: string; audio?: Partial<Record<"nadia", string>>;
};

export const SECTORS: Sector[] = [
  { id: "health", photo: "/organisations/health.jpg", name: { en: "Health", fr: "Santé" } },
  { id: "farming", photo: "/organisations/farming.jpg", name: { en: "Farming", fr: "Agriculture" } },
  { id: "learning", photo: "/organisations/learning.jpg", name: { en: "Learning", fr: "Éducation" } },
  { id: "public", photo: "/organisations/public.jpg", name: { en: "Public services", fr: "Services publics" } },
  { id: "markets", photo: "/organisations/markets.jpg", name: { en: "Markets", fr: "Commerce" } },
  { id: "stories", photo: "/organisations/statement.jpg", name: { en: "Stories", fr: "Contes" } },
];

export const IDEAS: Idea[] = [
  { id: "vaccination", sector: "health", title: { en: "Vaccination day", fr: "Jour de vaccination" },
    fr: `N’oubliez pas${n}: demain matin, amenez votre bébé au centre de santé pour la vaccination.`,
    ha: "Kar ki manta, gobe da safe ki kawo jaririnki asibiti don allurar rigakafi.", audio: { nadia: "/demo/clinic-nadia.m4a" } },
  { id: "heat", sector: "health", title: { en: "A very hot day", fr: "Une journée très chaude" },
    fr: `Bonjour${n}! Il fera très chaud aujourd’hui, alors buvez beaucoup d’eau.`,
    ha: "Ina kwana? Yau za a yi zafi sosai, don haka ku sha ruwa da yawa.", audio: { nadia: "/demo/weather-nadia.m4a" } },
  { id: "nets", sector: "health", title: { en: "Sleep under a net", fr: "Dormir sous une moustiquaire" },
    fr: "La saison des pluies arrive. Chaque nuit, dormez sous une moustiquaire avec vos enfants." },
  { id: "sowing", sector: "farming", title: { en: "Time to sow", fr: "Le temps des semis" },
    fr: "La saison des pluies s’est installée. Il est temps pour les agriculteurs de semer le mil et le sorgho.",
    ha: "Damina ta kama. Lokaci ya yi da manoma su fara shuka gero da dawa.", audio: { nadia: "/demo/farm-nadia.m4a" } },
  { id: "rain", sector: "farming", title: { en: "Heavy rain on Thursday", fr: "Fortes pluies jeudi" },
    fr: "De fortes pluies sont attendues jeudi. Mettez vos récoltes et vos semences à l’abri." },
  { id: "livestock", sector: "farming", title: { en: "Livestock vaccination", fr: "Vaccination du bétail" },
    fr: "La campagne de vaccination du bétail commence lundi. Amenez vos animaux au point de rassemblement." },
  { id: "counting", sector: "learning", title: { en: "Counting lesson", fr: "Leçon de calcul" },
    fr: `Apprenons à compter ensemble${n}: un, deux, trois, quatre, cinq.`,
    ha: "Bari mu koyi ƙidaya tare: ɗaya, biyu, uku, huɗu, biyar.", audio: { nadia: "/usecases/education.m4a" } },
  { id: "enrolment", sector: "learning", title: { en: "School enrolment", fr: "Inscriptions scolaires" },
    fr: "Les inscriptions pour la rentrée sont ouvertes jusqu’au 15 septembre. Venez avec l’acte de naissance de l’enfant." },
  { id: "literacy", sector: "learning", title: { en: "Adult literacy class", fr: "Cours d’alphabétisation" },
    fr: `Le cours d’alphabétisation pour adultes reprend mardi à 16${h}h, à l’école du quartier.` },
  { id: "form", sector: "public", title: { en: "Help with a form", fr: "Aide pour un formulaire" },
    fr: "Nous vous aidons à remplir le formulaire, étape par étape.",
    ha: "Za mu taimaka muku ku cike fom ɗin, mataki-mataki.", audio: { nadia: "/usecases/public.m4a" } },
  { id: "identity", sector: "public", title: { en: "Identity card", fr: "Carte d’identité" },
    fr: "Pour faire votre carte d’identité, apportez votre acte de naissance et deux photos." },
  { id: "meeting", sector: "public", title: { en: "Village meeting", fr: "Réunion du village" },
    fr: `Tous les habitants sont invités à une réunion samedi à 10${h}h, sous le grand arbre.` },
  { id: "mobile-money", sector: "markets", title: { en: "Mobile money safety", fr: "Sécurité mobile money" },
    fr: "Ne donnez jamais votre code secret, même à quelqu’un qui dit travailler pour l’opérateur." },
  { id: "prices", sector: "markets", title: { en: "This week’s prices", fr: "Les prix de la semaine" },
    fr: `Cette semaine au marché, le sac de mil se vend 18${n}000 francs et le sac de sorgho 15${n}000 francs.` },
  { id: "hours", sector: "markets", title: { en: "Opening hours", fr: "Heures d’ouverture" },
    fr: `La boutique est ouverte tous les jours de 8${h}h à 20${h}h.` },
  { id: "once", sector: "stories", title: { en: "Once, in a village", fr: "Il était une fois" },
    fr: "Un jour, dans un village, il y avait un vieux conteur." },
  { id: "tonight", sector: "stories", title: { en: "Tonight’s tale", fr: "Le conte de ce soir" },
    fr: `Ce soir, écoutez le conte du lièvre et de l’hyène, à 20${h}h sur notre radio.` },
];

/** An idea's recording in a voice, else the one it has. */
export const sampleOf = (i: Idea, voice: string): string | undefined => i.audio?.[voice as "nadia"] ?? Object.values(i.audio ?? {})[0];

/* Voice notes to try on Read and Translate: real Hausa said by Tafiya in Nadia's voice (public/demo, public/usecases),
   with its French. The recordings in the withdrawn voice (salim; lib/voices) are not offered here. */
export type TryNote = { id: string; audio: string; ha: string; fr: string };
export const TRY_NOTES: TryNote[] = [
  { id: "form", audio: "/usecases/public.m4a", ha: "Za mu taimaka muku ku cike fom ɗin, mataki-mataki.", fr: "Nous allons vous aider à remplir le formulaire étape par étape." },
  { id: "clinic", audio: "/demo/clinic-nadia.m4a", ha: "Kar ki manta, gobe da safe ki kawo jaririnki asibiti don allurar rigakafi.",
    fr: `N’oubliez pas${n}: demain matin, amenez votre bébé au centre de santé pour la vaccination.` },
  { id: "lesson", audio: "/usecases/education.m4a", ha: "Bari mu koyi ƙidaya tare: ɗaya, biyu, uku, huɗu, biyar.", fr: `Apprenons à compter ensemble${n}: un, deux, trois, quatre, cinq.` },
];

/* Showcases: real footage from Niger and Hausaland (Wiki Loves Africa and Wikitongues on Wikimedia Commons, CC BY-SA;
   public/showcase/CREDITS.md), each with what Namu's models made for it, through the API on 2026-11-01: the Hausa
   Tafiya said in Nadia's voice (the take Tatsuniya heard closest to the script, of two), or, for the storyteller, what
   Tatsuniya wrote down from his own voice and Kora's French for it, both unedited. The people shown are not Namu
   users. HA-REVIEW: the scripts' Hausa was drafted for the founder to check by ear. */
export type Showcase = {
  id: string; video: string; poster: string; tall?: boolean; focus?: string;
  who: Record<Lang, string>; title: Record<Lang, string>;
  /** speak: Nadia says `ha`, written from `fr`. read: `ha` is what Tatsuniya heard, `fr` Kora's French for it. */
  does: "speak" | "read"; ha: string; fr: string;
};

export const SHOWCASES: Showcase[] = [
  { id: "market-crier", video: "/showcase/market-crier.mp4", poster: "/showcase/market-crier.jpg", does: "speak",
    who: { en: "Traders", fr: "Commerçants" }, title: { en: "The market crier", fr: "Le crieur du marché" },
    fr: `Le marché de Boumba se tient dimanche${n}: mil, oignons et poisson frais. Venez tôt${n}!`,
    ha: "Albishirinku! Kasuwar Boumba za ta ci ranar Lahadi: akwai gero, albasa da kifi sabo. Ku zo da wuri." },
  { id: "storyteller", video: "/showcase/creator.mp4", poster: "/showcase/creator.jpg", does: "read",
    who: { en: "Creators", fr: "Créateurs" }, title: { en: "A storyteller, written down", fr: "Un conteur, mis par écrit" },
    ha: "yara a wajen har a raɗe-raɗe ta kama cewa shi sarkin wata ainin wanda lokacin yana neman saikashi, wanda wannan ta saba jaddada mutanen suka yi hijira.",
    fr: "Les enfants sur place, et même les rumeurs ont commencé à dire que le roi de la lune lui-même, qui à l’époque cherchait à s’isoler, ce qui avait souvent poussé les gens à émigrer." },
  { id: "herders", video: "/showcase/herders.mp4", poster: "/showcase/herders.jpg", does: "speak",
    who: { en: "Livestock services", fr: "Services de l’élevage" }, title: { en: "Herders on the move", fr: "Éleveurs en route" },
    fr: `Éleveurs${n}: la vaccination du bétail commence lundi à Ingall. Amenez vos animaux.`,
    ha: "Ya ku makiyaya, za a fara allurar rigakafin dabbobi ranar Litinin a Ingall. Ku kawo dabbobinku." },
  { id: "durbar", video: "/showcase/durbar.mp4", poster: "/showcase/durbar.jpg", does: "speak",
    who: { en: "Events", fr: "Événements" }, title: { en: "Durbar day", fr: "Jour de Durbar" },
    fr: `Samedi, la grande parade des cavaliers${n}: tambours, chevaux et couleurs. Venez nombreux${n}!`,
    ha: "Ranar Asabar za a yi babban Hawan Daba: ganguna, dawakai da kayan ado. Ku zo ku sha kallo!" },
  { id: "onions", video: "/showcase/onions.mp4", poster: "/showcase/onions.jpg", does: "speak", tall: true,
    who: { en: "Small businesses", fr: "Petits commerces" }, title: { en: "Galmi onions, by WhatsApp", fr: "Oignons de Galmi, par WhatsApp" },
    fr: "Oignons violets de Galmi, frais du jour. Livraison à Kano et Maradi. Écrivez-moi sur WhatsApp.",
    ha: "Albasar Galmi ja, sabuwa daga gona. Muna kai wa Kano da Maradi. Ku yi mini magana a WhatsApp." },
  { id: "mama", video: "/showcase/mama.mp4", poster: "/showcase/mama.jpg", does: "speak", tall: true, focus: "50% 12%",
    who: { en: "Families", fr: "Familles" }, title: { en: "A voice note for Mama", fr: "Un message vocal pour Maman" },
    fr: `Maman, le baptême du petit est samedi matin. Toute la famille t’attend${n}!`,
    ha: "Mama, za a yi sunan jariri ranar Asabar da safe. Dukkan dangi suna jiranki!" },
];

