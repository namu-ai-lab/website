/* Copy for Namu Agents (src/app/[lang]/agents, components/agents): the agents list, the templates, the builder, the
   conversation with an agent, conversations and knowledge. Words only where a label or an action needs them.
   Claims gate: an agent is a preview built on Namu's speech models in a chain (it hears, answers in text, speaks);
   never a single speech-to-speech model.
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication. */
import type { Lang } from "@/i18n/config";
import type { Channel, Purpose, Sector } from "./agent-templates";

const n = " ";   // narrow no-break space before French high punctuation

export type AgentsCopy = {
  list: { title: string; create: string; emptyH: string; browse: string; blank: string; docs: (n: number) => string; convs: (n: number) => string; open: string };
  templates: { title: string; blank: string; use: string; using: string; all: string; filters: { sector: string; purpose: string; channel: string }; sectors: Record<Sector, string>; purposes: Record<Purpose, string>; channels: Record<Channel, string> };
  tabs: { agent: string; workflow: string; knowledge: string; checks: string; tests: string; deploy: string; conversations: string };
  agent: { name: string; greeting: string; greetingPh: string; instructions: string; instructionsPh: string; languages: string; voice: string; remove: string; removeAsk: string };
  knowledge: { add: string; name: string; namePh: string; text: string; textPh: string; upload: string; save: string; chars: (n: string) => string; emptyH: string; tooBig: string; heard: string };
  checks: { goals: string; goalPh: string; fields: string; fieldPh: string; add: string };
  tests: { ask: string; askPh: string; expect: string; expectPh: string; add: string; runAll: string; running: string; passed: string; failed: string; notRun: string; reply: string; emptyH: string };
  deploy: { whatsapp: string; phoneId: string; phoneIdPh: string; webhook: string; verify: string; verifySet: string; connected: string; waiting: string; serverOff: string; web: string; phone: string; copy: string; copied: string; request: string; number: string };
  talk: { title: string; start: string; typePh: string; send: string; again: string; french: string; hide: string; thinking: string; caller: string; agent: string };
  convs: { title: string; emptyH: string; flag: string; unflag: string; flagged: string; all: string; turns: (n: number) => string; channels: Record<"test" | "whatsapp" | "web", string>; back: string };
  docsPage: { title: string; emptyH: string; th: { name: string; agent: string; size: string; added: string } };
  saved: string; saving: string; failed: string; delete: string;
  errors: { mic: string; nothing: string; tooMany: string };
};

export const agentsCopy: Record<Lang, AgentsCopy> = {
  en: {
    list: { title: "Agents", create: "New agent", emptyH: "Your first agent", browse: "Browse templates", blank: "Blank agent", docs: k => `${k} document${k === 1 ? "" : "s"}`, convs: k => `${k} conversation${k === 1 ? "" : "s"}`, open: "Open" },
    templates: {
      title: "Templates", blank: "Create blank agent", use: "Use template", using: "Creating…", all: "All", filters: { sector: "Sector", purpose: "Use", channel: "Channel" },
      sectors: { health: "Health", education: "Education", agriculture: "Agriculture", finance: "Finance", public: "Public services", commerce: "Commerce" },
      purposes: { information: "Information", support: "Support", advice: "Advice", learning: "Learning", reception: "Reception" },
      channels: { whatsapp: "WhatsApp", web: "Website", phone: "Phone line" },
    },
    tabs: { agent: "Agent", workflow: "Workflow", knowledge: "Knowledge", checks: "Checks", tests: "Tests", deploy: "Deploy", conversations: "Conversations" },
    agent: {
      name: "Name", greeting: "Greeting", greetingPh: "In French. Said in each language.", instructions: "Instructions", instructionsPh: "In French.",
      languages: "Languages", voice: "Voice", remove: "Delete agent", removeAsk: "Delete this agent, its documents and its conversations?",
    },
    knowledge: { add: "Add a document", name: "Name", namePh: "Health guide", text: "Text", textPh: "Paste the text here", upload: "Upload .txt or .md", save: "Add", chars: k => `${k} characters`, emptyH: "No document yet", tooBig: "Up to 200,000 characters per document.", heard: "Callers can hear what these documents say." },
    checks: { goals: "A good conversation", goalPh: "The caller gets an answer from the guides", fields: "Fields to collect", fieldPh: "Region", add: "Add" },
    tests: { ask: "Question", askPh: "My child has a high fever.", expect: "Must contain", expectPh: "CSI, health worker", add: "Add test", runAll: "Run all", running: "Running…", passed: "Passed", failed: "Failed", notRun: "Not run", reply: "Reply", emptyH: "No test yet" },
    deploy: {
      whatsapp: "WhatsApp", phoneId: "Phone number ID", phoneIdPh: "From Meta's WhatsApp Manager", webhook: "Webhook URL", verify: "Verify token",
      verifySet: "Set on the server", connected: "Connected", waiting: "No number yet", serverOff: "Not set up on this server yet", web: "Website", phone: "Phone line",
      copy: "Copy", copied: "Copied", request: "Connect a number", number: "Number",
    },
    talk: { title: "Talk to your agent", start: "Start", typePh: "Type a message", send: "Send", again: "New conversation", french: "French", hide: "Hide", thinking: "…", caller: "You", agent: "Agent" },
    convs: { title: "Conversations", emptyH: "No conversation yet", flag: "Flag", unflag: "Unflag", flagged: "Flagged", all: "All", turns: k => `${k} turn${k === 1 ? "" : "s"}`, channels: { test: "Test", whatsapp: "WhatsApp", web: "Website" }, back: "Conversations" },
    docsPage: { title: "Knowledge", emptyH: "No document yet", th: { name: "Document", agent: "Agent", size: "Size", added: "Added" } },
    saved: "Saved", saving: "Saving…", failed: "Not saved", delete: "Delete",
    errors: { mic: "The microphone is not available.", nothing: "Nothing was heard. Try again.", tooMany: "This agent has as many as it can hold." },
  },
  fr: {
    list: { title: "Agents", create: "Nouvel agent", emptyH: "Votre premier agent", browse: "Voir les modèles", blank: "Agent vierge", docs: k => `${k} document${k > 1 ? "s" : ""}`, convs: k => `${k} conversation${k > 1 ? "s" : ""}`, open: "Ouvrir" },
    templates: {
      title: "Modèles", blank: "Créer un agent vierge", use: "Utiliser ce modèle", using: "Création…", all: "Tout", filters: { sector: "Secteur", purpose: "Usage", channel: "Canal" },
      sectors: { health: "Santé", education: "Éducation", agriculture: "Agriculture", finance: "Finance", public: "Services publics", commerce: "Commerce" },
      purposes: { information: "Information", support: "Assistance", advice: "Conseil", learning: "Apprentissage", reception: "Accueil" },
      channels: { whatsapp: "WhatsApp", web: "Site web", phone: "Ligne téléphonique" },
    },
    tabs: { agent: "Agent", workflow: "Parcours", knowledge: "Connaissances", checks: "Critères", tests: "Tests", deploy: "Déployer", conversations: "Conversations" },
    agent: {
      name: "Nom", greeting: "Accueil", greetingPh: "En français. Dit dans chaque langue.", instructions: "Consignes", instructionsPh: "En français.",
      languages: "Langues", voice: "Voix", remove: "Supprimer l’agent", removeAsk: `Supprimer cet agent, ses documents et ses conversations${n}?`,
    },
    knowledge: { add: "Ajouter un document", name: "Nom", namePh: "Guide santé", text: "Texte", textPh: "Collez le texte ici", upload: "Importer un .txt ou .md", save: "Ajouter", chars: k => `${k} caractères`, emptyH: "Aucun document", tooBig: "200 000 caractères au plus par document.", heard: "Les appelants peuvent entendre ce que disent ces documents." },
    checks: { goals: "Une bonne conversation", goalPh: "La personne reçoit une réponse tirée des guides", fields: "Informations à recueillir", fieldPh: "Région", add: "Ajouter" },
    tests: { ask: "Question", askPh: "Mon enfant a une forte fièvre.", expect: "Doit contenir", expectPh: "CSI, agent de santé", add: "Ajouter un test", runAll: "Tout lancer", running: "En cours…", passed: "Réussi", failed: "Échoué", notRun: "Pas lancé", reply: "Réponse", emptyH: "Aucun test" },
    deploy: {
      whatsapp: "WhatsApp", phoneId: "ID du numéro", phoneIdPh: "Dans le WhatsApp Manager de Meta", webhook: "URL du webhook", verify: "Jeton de vérification",
      verifySet: "Défini sur le serveur", connected: "Connecté", waiting: "Aucun numéro", serverOff: "Pas encore configuré sur ce serveur", web: "Site web", phone: "Ligne téléphonique",
      copy: "Copier", copied: "Copié", request: "Connecter un numéro", number: "Numéro",
    },
    talk: { title: "Parler à votre agent", start: "Commencer", typePh: "Écrire un message", send: "Envoyer", again: "Nouvelle conversation", french: "Français", hide: "Masquer", thinking: "…", caller: "Vous", agent: "Agent" },
    convs: { title: "Conversations", emptyH: "Aucune conversation", flag: "Signaler", unflag: "Retirer", flagged: "Signalées", all: "Toutes", turns: k => `${k} tour${k > 1 ? "s" : ""}`, channels: { test: "Test", whatsapp: "WhatsApp", web: "Site web" }, back: "Conversations" },
    docsPage: { title: "Connaissances", emptyH: "Aucun document", th: { name: "Document", agent: "Agent", size: "Taille", added: "Ajouté" } },
    saved: "Enregistré", saving: "Enregistrement…", failed: "Non enregistré", delete: "Supprimer",
    errors: { mic: "Le micro n’est pas disponible.", nothing: "Rien n’a été entendu. Réessayez.", tooMany: "Cet agent en contient déjà le maximum." },
  },
};
