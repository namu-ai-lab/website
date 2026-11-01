/* Copy for Namu Agents (src/app/[lang]/agents, components/agents): the agents list, the templates, the agent's page
   (Agent, Knowledge, Conversations, WhatsApp and the talk panel) and the conversations. Words only where a label or an
   action needs them. Claims gate: an agent is a preview built on Namu's speech models in a chain (it hears, answers
   in text, speaks); never a single speech-to-speech model.
   French: read and approved by the founder on 2026-11-01. */
import type { Lang } from "@/i18n/config";
import type { Sector } from "./agent-templates";

const n = " ";   // narrow no-break space before French high punctuation

export type AgentsCopy = {
  list: { title: string; create: string; creating: string; emptyH: string; fromTemplate: string; seeAll: string; live: string; draft: string; open: string };
  templates: { title: string; all: string; blank: string; using: string; listen: string; sectors: Record<Sector, string> };
  tabs: { agent: string; knowledge: string; conversations: string; whatsapp: string };
  agent: { name: string; greeting: string; greetingPh: string; instructions: string; instructionsPh: string; languages: string; voice: string; remove: string; removeAsk: string };
  knowledge: { add: string; write: string; name: string; namePh: string; text: string; textPh: string; save: string; cancel: string; chars: (n: string) => string; emptyH: string; tooBig: string; heard: string };
  whatsapp: { title: string; phoneId: string; phoneIdPh: string; webhook: string; verify: string; verifySet: string; waiting: string; serverOff: string; copy: string; copied: string; request: string; number: string };
  talk: { label: string; start: string; speak: string; stop: string; again: string };
  convs: { title: string; emptyH: string; flag: string; unflag: string; flagged: string; all: string; turns: (n: number) => string; channels: Record<"test" | "whatsapp" | "web", string>; back: string; caller: string; agent: string; french: string; hide: string };
  saved: string; saving: string; failed: string; delete: string;
  errors: { mic: string; nothing: string; tooMany: string; generic: string };
};

export const agentsCopy: Record<Lang, AgentsCopy> = {
  en: {
    list: { title: "Agents", create: "New agent", creating: "Creating…", emptyH: "Your first agent", fromTemplate: "Start from a template", seeAll: "See all", live: "On WhatsApp", draft: "Draft", open: "Open" },
    templates: {
      title: "Templates", all: "All", blank: "Blank agent", using: "Creating…", listen: "Listen",
      sectors: { health: "Health", farming: "Farming", learning: "Learning", public: "Public services", markets: "Markets", stories: "Stories" },
    },
    tabs: { agent: "Agent", knowledge: "Knowledge", conversations: "Conversations", whatsapp: "WhatsApp" },
    agent: {
      name: "Name", greeting: "First words", greetingPh: "In French", instructions: "What it does", instructionsPh: "In French",
      languages: "Languages", voice: "Voice", remove: "Delete agent", removeAsk: "Delete this agent, its documents and its conversations?",
    },
    knowledge: {
      add: "Add a document", write: "Write it", name: "Name", namePh: "Vaccination calendar", text: "Text", textPh: "Paste or write the text", save: "Add", cancel: "Cancel",
      chars: k => `${k} characters`, emptyH: "No documents yet", tooBig: "Up to 200,000 characters per document.", heard: "Callers can hear what these documents say.",
    },
    whatsapp: {
      title: "WhatsApp", phoneId: "Phone number ID", phoneIdPh: "From Meta’s WhatsApp Manager", webhook: "Webhook URL", verify: "Verify token",
      verifySet: "Set on the server", waiting: "No number yet", serverOff: "Not set up on this server yet", copy: "Copy", copied: "Copied", request: "Connect a number", number: "Number",
    },
    talk: { label: "Talk to your agent", start: "Talk to it", speak: "Speak", stop: "Stop", again: "Start again" },
    convs: {
      title: "Conversations", emptyH: "No conversations yet", flag: "Flag", unflag: "Unflag", flagged: "Flagged", all: "All", turns: k => `${k} turn${k === 1 ? "" : "s"}`,
      channels: { test: "Test", whatsapp: "WhatsApp", web: "Website" }, back: "Conversations", caller: "Caller", agent: "Agent", french: "French", hide: "Hide",
    },
    saved: "Saved", saving: "Saving…", failed: "Not saved", delete: "Delete",
    errors: { mic: "The microphone is not available.", nothing: "Nothing was heard. Try again.", tooMany: "This agent has as many as it can hold.", generic: "Something went wrong. Try again." },
  },
  fr: {
    list: { title: "Agents", create: "Nouvel agent", creating: "Création…", emptyH: "Votre premier agent", fromTemplate: "Partir d’un modèle", seeAll: "Tout voir", live: "Sur WhatsApp", draft: "Brouillon", open: "Ouvrir" },
    templates: {
      title: "Modèles", all: "Tout", blank: "Agent vierge", using: "Création…", listen: "Écouter",
      sectors: { health: "Santé", farming: "Agriculture", learning: "Éducation", public: "Services publics", markets: "Commerce", stories: "Contes" },
    },
    tabs: { agent: "Agent", knowledge: "Connaissances", conversations: "Conversations", whatsapp: "WhatsApp" },
    agent: {
      name: "Nom", greeting: "Premiers mots", greetingPh: "En français", instructions: "Ce qu’il fait", instructionsPh: "En français",
      languages: "Langues", voice: "Voix", remove: "Supprimer l’agent", removeAsk: `Supprimer cet agent, ses documents et ses conversations${n}?`,
    },
    knowledge: {
      add: "Ajouter un document", write: "L’écrire", name: "Nom", namePh: "Calendrier de vaccination", text: "Texte", textPh: "Collez ou écrivez le texte", save: "Ajouter", cancel: "Annuler",
      chars: k => `${k} caractères`, emptyH: "Aucun document pour l’instant", tooBig: "200 000 caractères au plus par document.", heard: "Les appelants peuvent entendre ce que disent ces documents.",
    },
    whatsapp: {
      title: "WhatsApp", phoneId: "ID du numéro", phoneIdPh: "Dans le WhatsApp Manager de Meta", webhook: "URL du webhook", verify: "Jeton de vérification",
      verifySet: "Défini sur le serveur", waiting: "Pas encore de numéro", serverOff: "Pas encore configuré sur ce serveur", copy: "Copier", copied: "Copié", request: "Connecter un numéro", number: "Numéro",
    },
    talk: { label: "Parler à votre agent", start: "Lui parler", speak: "Parler", stop: "Arrêter", again: "Recommencer" },
    convs: {
      title: "Conversations", emptyH: "Aucune conversation pour l’instant", flag: "Signaler", unflag: "Retirer", flagged: "Signalées", all: "Toutes", turns: k => `${k} échange${k > 1 ? "s" : ""}`,
      channels: { test: "Test", whatsapp: "WhatsApp", web: "Site web" }, back: "Conversations", caller: "Appelant", agent: "Agent", french: "Français", hide: "Masquer",
    },
    saved: "Enregistré", saving: "Enregistrement…", failed: "Non enregistré", delete: "Supprimer",
    errors: { mic: "Le micro n’est pas disponible.", nothing: "Rien n’a été entendu. Réessayez.", tooMany: "Cet agent en contient déjà le maximum.", generic: "Une erreur est survenue. Réessayez." },
  },
};
