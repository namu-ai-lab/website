/* Copy shared by the platform's three doors (Namu Create, Namu Agents, Namu API): the sidebar, the switch, and the
   words every door uses (tasks, voice uses, output targets, common actions). Each door's own pages keep their copy in
   content/create.ts, content/agents.ts and content/console.ts. Short on purpose: the platform names things and
   does not describe them. The doors' names are product names, the same in every language.
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication. */
import type { Lang } from "@/i18n/config";
import type { OutputId, Task, Use } from "@/lib/catalog";

export type DoorId = "create" | "agents" | "api";

export type PlatformCopy = {
  doors: Record<DoorId, string>;
  access: { approved: string; pending: string; denied: string };
  switchTo: string; menu: string; openMenu: string; closeMenu: string; signedIn: string;
  nav: {
    home: string; voices: string; projects: string; kit: string; tools: string; speak: string; transcribe: string; video: string;
    agents: string; templates: string; conversations: string; knowledge: string;
    keys: string; limits: string; models: string; products: string; monitoring: string; usage: string; logs: string;
    playground: string; settings: string; admin: string; docs: string; reference: string;
  };
  tasks: Record<Task, string>;
  uses: Record<Use, string>;
  outputs: Record<OutputId, string>;
  gender: { female: string; male: string };
  soon: string; all: string; play: string; stop: string; pause: string; download: string; save: string; saved: string; saving: string;
  cancel: string; delete: string; create: string; search: string; back: string; copy: string; copied: string; retry: string;
  notReady: [string, string];
  library: { search: string; language: string; use: string; useIn: string; copyId: string; none: string; coming: string };
  record: { record: string; stop: string; upload: string; recording: (t: string) => string; mic: string; decode: string; long: (min: number) => string };
  voice: string;
  errors: { network: string; generic: string };
};

export const platformCopy: Record<Lang, PlatformCopy> = {
  en: {
    doors: { create: "Create", agents: "Agents", api: "API" },
    access: { approved: "Beta", pending: "Setting up", denied: "Paused" },
    switchTo: "Switch", menu: "Menu", openMenu: "Open menu", closeMenu: "Close menu", signedIn: "Signed in as",
    nav: {
      home: "Home", voices: "Voices", projects: "Projects", kit: "Kit", tools: "Tools", speak: "Speak", transcribe: "Transcribe", video: "Translate a video",
      agents: "Agents", templates: "Templates", conversations: "Conversations", knowledge: "Knowledge",
      keys: "API keys", limits: "Plan and limits", models: "Models", products: "Products", monitoring: "Monitoring", usage: "Usage", logs: "Logs",
      playground: "Playground", settings: "Settings", admin: "Accounts", docs: "Docs", reference: "API reference",
    },
    tasks: { speech: "Speech", transcribe: "Transcription", translate: "Translation", converse: "Conversation" },
    uses: { health: "Health", education: "Education", radio: "Radio", stories: "Stories", public: "Public information", business: "Business" },
    outputs: { whatsapp: "WhatsApp", radio: "Radio", phone: "Phone line", file: "File" },
    gender: { female: "Female", male: "Male" },
    soon: "Soon", all: "All", play: "Play", stop: "Stop", pause: "Pause", download: "Download", save: "Save", saved: "Saved", saving: "Saving…",
    cancel: "Cancel", delete: "Delete", create: "Create", search: "Search", back: "Back", copy: "Copy", copied: "Copied", retry: "Try again",
    notReady: ["Almost ready", "This part of the platform is being set up."],
    library: { search: "Search voices", language: "Language", use: "Use", useIn: "Use in Speak", copyId: "Copy ID", none: "No voice matches.", coming: "Coming" },
    record: { record: "Record", stop: "Stop", upload: "Upload", recording: t => `Recording · ${t}`, mic: "The microphone is not available.", decode: "This file cannot be read.", long: m => `Up to ${m} minutes.` },
    voice: "Voice",
    errors: { network: "No connection. Try again.", generic: "Something went wrong. Try again." },
  },
  fr: {
    doors: { create: "Create", agents: "Agents", api: "API" },
    access: { approved: "Bêta", pending: "Configuration", denied: "En pause" },
    switchTo: "Changer", menu: "Menu", openMenu: "Ouvrir le menu", closeMenu: "Fermer le menu", signedIn: "Connecté en tant que",
    nav: {
      home: "Accueil", voices: "Voix", projects: "Projets", kit: "Kit", tools: "Outils", speak: "Parler", transcribe: "Transcrire", video: "Traduire une vidéo",
      agents: "Agents", templates: "Modèles", conversations: "Conversations", knowledge: "Connaissances",
      keys: "Clés d’API", limits: "Offre et limites", models: "Modèles", products: "Produits", monitoring: "Suivi", usage: "Consommation", logs: "Journaux",
      playground: "Bac à sable", settings: "Paramètres", admin: "Comptes", docs: "Documentation", reference: "Référence de l’API",
    },
    tasks: { speech: "Synthèse vocale", transcribe: "Transcription", translate: "Traduction", converse: "Conversation" },
    uses: { health: "Santé", education: "Éducation", radio: "Radio", stories: "Contes", public: "Information publique", business: "Entreprise" },
    outputs: { whatsapp: "WhatsApp", radio: "Radio", phone: "Ligne téléphonique", file: "Fichier" },
    gender: { female: "Femme", male: "Homme" },
    soon: "Bientôt", all: "Tout", play: "Écouter", stop: "Arrêter", pause: "Pause", download: "Télécharger", save: "Enregistrer", saved: "Enregistré", saving: "Enregistrement…",
    cancel: "Annuler", delete: "Supprimer", create: "Créer", search: "Rechercher", back: "Retour", copy: "Copier", copied: "Copié", retry: "Réessayer",
    notReady: ["Presque prêt", "Cette partie de la plateforme est en cours d’installation."],
    library: { search: "Rechercher une voix", language: "Langue", use: "Usage", useIn: "Utiliser dans Parler", copyId: "Copier l’ID", none: "Aucune voix ne correspond.", coming: "À venir" },
    record: { record: "Enregistrer", stop: "Arrêter", upload: "Importer", recording: t => `Enregistrement · ${t}`, mic: "Le micro n’est pas disponible.", decode: "Ce fichier ne peut pas être lu.", long: m => `${m} minutes au plus.` },
    voice: "Voix",
    errors: { network: "Pas de connexion. Réessayez.", generic: "Un problème est survenu. Réessayez." },
  },
};
