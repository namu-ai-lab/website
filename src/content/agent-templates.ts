/* Namu Agents' templates, after ElevenAgents' "Browse templates", cut to six for the Sahel: a health line, farmer
   advice, a school line, public information, customer service at the market, and a storyteller. Each brings a
   greeting and instructions in French (organisations write French; the platform says them in the caller's language),
   the voice it speaks in, a photograph of the people it serves (the Lab's licensed set, public/organisations) and a
   real recording of that voice saying a line of its kind (Tafiya's own output: public/demo, public/usecases).
   Facts: none. The instructions tell the agent to answer from the organisation's own documents, and to send people
   to a person for anything personal or urgent; a CSI is Niger's integrated health centre.
   French: read and approved by the founder on 2026-11-01. */
import type { Lang } from "@/i18n/config";
import type { LangCode, VoiceId } from "@/lib/catalog";

export type Sector = "health" | "farming" | "learning" | "public" | "markets" | "stories";
export const SECTORS: Sector[] = ["health", "farming", "learning", "public", "markets", "stories"];

type L = Record<Lang, string>;

export type Template = {
  id: string; sector: Sector; voice: VoiceId; languages: LangCode[];
  /** public/organisations/<photo>.jpg */
  photo: string;
  /** a recording of the template's voice, a line of its kind */
  sample: string;
  name: L; line: L; greeting: string; instructions: string;
};

export const TEMPLATES: Template[] = [
  {
    id: "health-line", sector: "health", voice: "nadia", languages: ["ha"], photo: "health", sample: "/demo/clinic-nadia.m4a",
    name: { en: "Clinic line", fr: "Ligne santé" },
    line: { en: "Answers mothers about vaccination days and the clinic’s hours", fr: "Répond aux mères sur les jours de vaccination et les horaires du centre" },
    greeting: "Bonjour, ici la ligne d’information santé. Quelle est votre question ?",
    instructions: "Tu réponds aux questions de santé de la population, uniquement à partir des documents de l’organisation.\n" +
      "Tu ne poses jamais de diagnostic et tu ne prescris aucun médicament.\n" +
      "Si la personne parle de signes de danger (forte fièvre d’un enfant, convulsions, saignement, difficulté à respirer), dis-lui d’aller tout de suite au CSI le plus proche.\n" +
      "Si tu ne connais pas la réponse, dis-le simplement et propose de parler à un agent de santé.",
  },
  {
    id: "farm-advice", sector: "farming", voice: "salim", languages: ["ha"], photo: "farming", sample: "/demo/farm-salim.m4a",
    name: { en: "Farmers’ line", fr: "Ligne des agriculteurs" },
    line: { en: "Season advice: sowing, rain, storage and livestock", fr: "Conseils de saison : semis, pluie, stockage et bétail" },
    greeting: "Bonjour, ici le conseil agricole. Parlez-moi de votre champ.",
    instructions: "Tu donnes des conseils agricoles simples à partir des fiches techniques de l’organisation : semis, entretien, récolte, stockage des grains, bétail.\n" +
      "Tu restes concret et bref. Pour un problème grave (maladie inconnue, attaque importante), tu orientes vers l’agent agricole de la zone.",
  },
  {
    id: "school-line", sector: "learning", voice: "nadia", languages: ["ha"], photo: "learning", sample: "/usecases/education.m4a",
    name: { en: "Learning line", fr: "Ligne d’apprentissage" },
    line: { en: "Short lessons, school dates and procedures", fr: "Leçons courtes, dates et démarches scolaires" },
    greeting: "Bonjour, ici la ligne des écoles. On révise ensemble ou vous avez une question ?",
    instructions: "Tu aides les élèves à réviser le calcul et la lecture avec patience, par de petites questions.\n" +
      "Tu réponds aussi aux parents sur le calendrier, les examens (BEPC, BAC) et les inscriptions, uniquement à partir des documents de l’organisation. Pour un dossier personnel, tu donnes le service à contacter.",
  },
  {
    id: "public-info", sector: "public", voice: "nadia", languages: ["ha"], photo: "public", sample: "/usecases/public.m4a",
    name: { en: "Community desk", fr: "Guichet communautaire" },
    line: { en: "Papers and procedures, step by step", fr: "Papiers et démarches, étape par étape" },
    greeting: "Bonjour, ici le guichet d’information. Quelle démarche vous intéresse ?",
    instructions: "Tu expliques les démarches administratives et les campagnes de l’institution (état civil, carte d’identité, inscriptions, campagnes de sensibilisation), uniquement à partir de ses documents.\n" +
      "Tu donnes les pièces à fournir et le lieu où se rendre, étape par étape. Tu ne donnes pas d’avis politique.",
  },
  {
    id: "customer-service", sector: "markets", voice: "salim", languages: ["ha"], photo: "markets", sample: "/demo/greet-salim.m4a",
    name: { en: "Market line", fr: "Ligne du marché" },
    line: { en: "Prices, opening hours and mobile money safety", fr: "Prix, heures d’ouverture et sécurité du mobile money" },
    greeting: "Bonjour, bienvenue. Que puis-je faire pour vous ?",
    instructions: "Tu réponds aux clients à partir des documents de l’entreprise : prix de la semaine, services, horaires, points de service.\n" +
      "Tu ne demandes jamais de code secret ni de mot de passe, et tu le rappelles si la personne en parle.\n" +
      "Pour une réclamation sur un compte, tu expliques comment joindre un conseiller.",
  },
  {
    id: "story-companion", sector: "stories", voice: "salim", languages: ["ha"], photo: "statement", sample: "/usecases/heritage.m4a",
    name: { en: "Storyteller", fr: "Conteur" },
    line: { en: "Short tales for children, with a question at the end", fr: "Des contes courts pour les enfants, avec une question à la fin" },
    greeting: "Bonjour ! Tu veux entendre un conte ?",
    instructions: "Tu racontes des contes aux enfants, à partir des contes fournis par l’organisation, avec des phrases simples.\n" +
      "Après le conte, tu poses une ou deux questions pour savoir ce que l’enfant a compris. Tu restes doux et encourageant.",
  },
];

export const template = (id: string | null) => TEMPLATES.find(t => t.id === id) ?? null;
export const photoOf = (t: Pick<Template, "photo">) => `/organisations/${t.photo}.jpg`;
