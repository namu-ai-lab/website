/* Namu Agents' templates, after ElevenAgents' "Browse templates", for the Sahel: a health information line, a school
   helpline, farming advice, customer service, public information, French practice, a story companion and a front
   desk. Each brings a greeting and instructions in French (organisations write French; the platform says them in the
   caller's language), its checks, a few tests, and the steps drawn on the template's preview.
   Facts: none. The instructions tell the agent to answer from the organisation's own documents, and to send people
   to a person for anything personal or urgent; a CSI is Niger's integrated health centre.
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication. */
import type { Lang } from "@/i18n/config";
import type { LangCode } from "@/lib/catalog";
import type { Check } from "@/lib/agent-shape";

export type Sector = "health" | "education" | "agriculture" | "finance" | "public" | "commerce";
export type Purpose = "information" | "support" | "advice" | "learning" | "reception";
export type Channel = "whatsapp" | "web" | "phone";
export const SECTORS: Sector[] = ["health", "education", "agriculture", "finance", "public", "commerce"];
export const PURPOSES: Purpose[] = ["information", "support", "advice", "learning", "reception"];
export const CHANNELS: Channel[] = ["whatsapp", "web", "phone"];

type L = Record<Lang, string>;
export type Step = { id: string; kind: "start" | "step" | "end"; label: L; next: { to: string; when?: L }[] };

export type Template = {
  id: string; sector: Sector; purpose: Purpose; channels: Channel[]; languages: LangCode[];
  name: L; line: L; greeting: string; instructions: string; checks: Check[]; tests: { ask: string; expect: string[] }[]; steps: Step[];
};

const s = (id: string, kind: Step["kind"], en: string, fr: string, next: Step["next"] = []): Step => ({ id, kind, label: { en, fr }, next });
const go = (to: string, en?: string, fr?: string) => (en && fr ? { to, when: { en, fr } } : { to });

export const TEMPLATES: Template[] = [
  {
    id: "health-line", sector: "health", purpose: "information", channels: ["whatsapp", "phone"], languages: ["ha"],
    name: { en: "Health information line", fr: "Ligne d’information santé" },
    line: { en: "Answers health questions from your approved guides", fr: "Répond aux questions de santé à partir de vos guides" },
    greeting: "Bonjour, ici la ligne d’information santé. Quelle est votre question ?",
    instructions: "Tu réponds aux questions de santé de la population, uniquement à partir des documents de l’organisation.\n" +
      "Tu ne poses jamais de diagnostic et tu ne prescris aucun médicament.\n" +
      "Si la personne parle de signes de danger (forte fièvre d’un enfant, convulsions, saignement, difficulté à respirer), dis-lui d’aller tout de suite au CSI le plus proche.\n" +
      "Si tu ne connais pas la réponse, dis-le simplement et propose de parler à un agent de santé.",
    checks: [
      { kind: "goal", text: "La personne reçoit une réponse tirée des documents" },
      { kind: "goal", text: "Les signes de danger sont orientés vers le CSI" },
      { kind: "field", text: "Sujet de la question" },
      { kind: "field", text: "Région" },
    ],
    tests: [{ ask: "Mon enfant a une forte fièvre et des convulsions.", expect: ["CSI"] }],
    steps: [
      s("start", "start", "Greeting", "Accueil", [go("ask")]),
      s("ask", "step", "Understand the question", "Comprendre la question", [go("answer", "A question", "Une question"), go("refer", "Danger signs", "Signes de danger")]),
      s("answer", "step", "Answer from the guides", "Répondre à partir des guides", [go("end")]),
      s("refer", "step", "Send to the nearest CSI", "Orienter vers le CSI", [go("end")]),
      s("end", "end", "Close", "Clôturer"),
    ],
  },
  {
    id: "school-line", sector: "education", purpose: "information", channels: ["whatsapp", "web"], languages: ["ha"],
    name: { en: "School and exam helpline", fr: "Ligne écoles et examens" },
    line: { en: "Dates, results and procedures for parents and pupils", fr: "Dates, résultats et démarches pour parents et élèves" },
    greeting: "Bonjour, ici la ligne d’information des écoles. Comment puis-je vous aider ?",
    instructions: "Tu aides les parents et les élèves avec les informations scolaires : calendrier, examens (BEPC, BAC), inscriptions et démarches.\n" +
      "Tu réponds uniquement à partir des documents de l’organisation. Pour un dossier personnel, tu donnes le service à contacter.",
    checks: [{ kind: "goal", text: "La date ou la démarche demandée est donnée" }, { kind: "field", text: "Examen ou niveau" }],
    tests: [{ ask: "Où puis-je déposer le dossier d’inscription ?", expect: [] }],
    steps: [
      s("start", "start", "Greeting", "Accueil", [go("ask")]),
      s("ask", "step", "Understand the need", "Comprendre la demande", [go("answer", "General", "Général"), go("office", "A personal file", "Un dossier personnel")]),
      s("answer", "step", "Give the date or procedure", "Donner la date ou la démarche", [go("end")]),
      s("office", "step", "Name the office to contact", "Indiquer le service à contacter", [go("end")]),
      s("end", "end", "Close", "Clôturer"),
    ],
  },
  {
    id: "farm-advice", sector: "agriculture", purpose: "advice", channels: ["whatsapp", "phone"], languages: ["ha"],
    name: { en: "Farmer advice", fr: "Conseil agricole" },
    line: { en: "Planting, storage and where to find support", fr: "Semis, stockage et où trouver un appui" },
    greeting: "Bonjour, ici le conseil agricole. Parlez-moi de votre champ.",
    instructions: "Tu donnes des conseils agricoles simples à partir des fiches techniques de l’organisation : semis, entretien, récolte, stockage des grains.\n" +
      "Tu restes concret et bref. Pour un problème grave (maladie inconnue, attaque importante), tu orientes vers l’agent agricole de la zone.",
    checks: [{ kind: "goal", text: "Le conseil vient des fiches techniques" }, { kind: "field", text: "Culture" }, { kind: "field", text: "Village ou commune" }],
    tests: [{ ask: "Comment conserver le mil après la récolte ?", expect: [] }],
    steps: [
      s("start", "start", "Greeting", "Accueil", [go("ask")]),
      s("ask", "step", "Crop and problem", "Culture et problème", [go("advise", "Known", "Connu"), go("agent", "Serious or unknown", "Grave ou inconnu")]),
      s("advise", "step", "Give the advice", "Donner le conseil", [go("end")]),
      s("agent", "step", "Refer to the field agent", "Orienter vers l’agent", [go("end")]),
      s("end", "end", "Close", "Clôturer"),
    ],
  },
  {
    id: "customer-service", sector: "finance", purpose: "support", channels: ["whatsapp", "web", "phone"], languages: ["ha"],
    name: { en: "Customer service", fr: "Service client" },
    line: { en: "Procedures, opening hours and where to go", fr: "Démarches, horaires et où aller" },
    greeting: "Bonjour, bienvenue au service client. Que puis-je faire pour vous ?",
    instructions: "Tu réponds aux clients à partir des documents de l’entreprise : services, démarches, horaires, points de service.\n" +
      "Tu ne demandes jamais de code secret ni de mot de passe, et tu le rappelles si la personne en parle.\n" +
      "Pour une réclamation sur un compte, tu expliques comment joindre un conseiller.",
    checks: [{ kind: "goal", text: "Aucun code secret n’est demandé" }, { kind: "goal", text: "La démarche est expliquée" }, { kind: "field", text: "Motif de l’appel" }],
    tests: [{ ask: "Je veux vous donner mon code secret pour vérifier mon compte.", expect: [] }],
    steps: [
      s("start", "start", "Greeting", "Accueil", [go("ask")]),
      s("ask", "step", "Reason for the call", "Motif de l’appel", [go("explain", "A procedure", "Une démarche"), go("advisor", "A complaint", "Une réclamation")]),
      s("explain", "step", "Explain the procedure", "Expliquer la démarche", [go("end")]),
      s("advisor", "step", "Hand to an advisor", "Passer à un conseiller", [go("end")]),
      s("end", "end", "Close", "Clôturer"),
    ],
  },
  {
    id: "public-info", sector: "public", purpose: "information", channels: ["whatsapp", "phone"], languages: ["ha"],
    name: { en: "Public information", fr: "Information publique" },
    line: { en: "Explains a procedure or a campaign", fr: "Explique une démarche ou une campagne" },
    greeting: "Bonjour, ici le service d’information. Quelle démarche vous intéresse ?",
    instructions: "Tu expliques les démarches administratives et les campagnes de l’institution (état civil, inscriptions, campagnes de sensibilisation), uniquement à partir de ses documents.\n" +
      "Tu donnes les pièces à fournir et le lieu où se rendre. Tu ne donnes pas d’avis politique.",
    checks: [{ kind: "goal", text: "Les pièces et le lieu sont donnés" }, { kind: "goal", text: "Aucun avis politique" }, { kind: "field", text: "Démarche" }],
    tests: [{ ask: "Que faut-il pour déclarer une naissance ?", expect: [] }],
    steps: [
      s("start", "start", "Greeting", "Accueil", [go("ask")]),
      s("ask", "step", "Which procedure", "Quelle démarche", [go("explain")]),
      s("explain", "step", "Documents and place", "Pièces et lieu", [go("end")]),
      s("end", "end", "Close", "Clôturer"),
    ],
  },
  {
    id: "french-practice", sector: "education", purpose: "learning", channels: ["whatsapp", "web"], languages: ["ha"],
    name: { en: "French practice", fr: "Pratique du français" },
    line: { en: "Practise speaking French, helped in your language", fr: "Pratiquer le français à l’oral, avec de l’aide dans sa langue" },
    greeting: "Bonjour ! On pratique le français ensemble ? Dites-moi une phrase.",
    instructions: "Tu aides une personne qui parle haoussa à pratiquer le français à l’oral.\n" +
      "Tu proposes des phrases courtes de la vie de tous les jours, tu corriges avec douceur et tu expliques dans la langue de la personne quand elle ne comprend pas.",
    checks: [{ kind: "goal", text: "Une correction claire et bienveillante" }, { kind: "field", text: "Niveau" }],
    tests: [{ ask: "Moi aller au marché hier.", expect: [] }],
    steps: [
      s("start", "start", "Greeting", "Accueil", [go("say")]),
      s("say", "step", "Listen to a sentence", "Écouter une phrase", [go("correct")]),
      s("correct", "step", "Correct and explain", "Corriger et expliquer", [go("say", "Again", "Encore"), go("end", "Done", "Fini")]),
      s("end", "end", "Close", "Clôturer"),
    ],
  },
  {
    id: "story-companion", sector: "education", purpose: "learning", channels: ["whatsapp", "web"], languages: ["ha"],
    name: { en: "Story companion", fr: "Compagnon de contes" },
    line: { en: "Tells and talks about folktales with children", fr: "Raconte des contes et en parle avec les enfants" },
    greeting: "Bonjour ! Tu veux entendre un conte ?",
    instructions: "Tu racontes des contes aux enfants, à partir des contes fournis par l’organisation, avec des phrases simples.\n" +
      "Après le conte, tu poses une ou deux questions pour savoir ce que l’enfant a compris. Tu restes doux et encourageant.",
    checks: [{ kind: "goal", text: "Le conte vient des documents" }, { kind: "goal", text: "Une question de compréhension est posée" }],
    tests: [{ ask: "Raconte-moi un conte.", expect: [] }],
    steps: [
      s("start", "start", "Greeting", "Accueil", [go("tell")]),
      s("tell", "step", "Tell a tale", "Raconter un conte", [go("ask")]),
      s("ask", "step", "Ask what was understood", "Questionner l’enfant", [go("end")]),
      s("end", "end", "Close", "Clôturer"),
    ],
  },
  {
    id: "front-desk", sector: "commerce", purpose: "reception", channels: ["phone", "whatsapp"], languages: ["ha"],
    name: { en: "Front desk", fr: "Accueil" },
    line: { en: "Answers, informs and takes a message", fr: "Répond, informe et prend un message" },
    greeting: "Bonjour, vous êtes bien à l’accueil. Comment puis-je vous aider ?",
    instructions: "Tu es l’accueil de l’organisation : horaires, adresse, services. Si la personne veut parler à quelqu’un, tu prends son nom, son numéro et son message.",
    checks: [{ kind: "goal", text: "Le message est complet" }, { kind: "field", text: "Nom" }, { kind: "field", text: "Numéro" }, { kind: "field", text: "Message" }],
    tests: [{ ask: "Quels sont vos horaires ?", expect: [] }],
    steps: [
      s("start", "start", "Greeting", "Accueil", [go("ask")]),
      s("ask", "step", "What is needed", "Le besoin", [go("inform", "Information", "Information"), go("message", "Speak to someone", "Parler à quelqu’un")]),
      s("inform", "step", "Give the information", "Informer", [go("end")]),
      s("message", "step", "Take a message", "Prendre un message", [go("end")]),
      s("end", "end", "Close", "Clôturer"),
    ],
  },
];

/** A blank agent's steps: greet, answer, close. */
export const BLANK_STEPS: Step[] = [
  s("start", "start", "Greeting", "Accueil", [go("answer")]),
  s("answer", "step", "Answer", "Répondre", [go("end")]),
  s("end", "end", "Close", "Clôturer"),
];

export const template = (id: string | null) => TEMPLATES.find(t => t.id === id) ?? null;
