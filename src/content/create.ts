/* Copy for Namu Create (src/components/create): Home, Voice message, Interpreter, Translate and Voices. Names and
   actions only; the platform does not explain itself, except the Interpreter's one line. The pages' names are in
   content/platform.ts (nav). French: read and approved by the founder on 2026-11-01; the Interpreter's (2026-11-01,
   later) is new. */
import type { Lang } from "@/i18n/config";
import type { OutputId } from "@/lib/catalog";

const n = " ";   // narrow no-break space before French high punctuation

export type CreateCopy = {
  home: {
    question: string; placeholder: string; writtenIn: string; to: string; make: string; again: string;
    translating: string; speaking: string; whatsapp: string; download: string;
    searchIdeas: string; ideasIn: (n: number) => string; noIdea: string; tryYours: string; speakIn: (name: string) => string; orWrite: (name: string) => string;
    ideas: string; recent: string; all: string; use: string; text: string; none: string; agents: string;
  };
  speak: {
    placeholder: string; language: string; voice: string; madeFor: string; writtenIn: string; make: string; again: string;
    original: string; restore: string; fix: (letters: string) => string; chars: (used: string, max: string) => string; tooLong: (max: string) => string;
    history: string; none: string;
  };
  interpret: {
    /** the page's line: both sides can be spoken, or only `from` (when `to` has a voice and `from` has none) */
    lede: (a: string, b: string) => string; ledeOne: (from: string, to: string) => string;
    record: string; stop: string; cancel: string; uploadIn: (name: string) => string; upload: string; tryOne: string; sampleIn: (name: string) => string;
    listening: string; nothing: string; listen: string; share: string;
    history: string; back: string; none: string; fresh: string; resume: string; removeConv: string; exchanges: (n: number) => string; today: string; yesterday: string; remove: string; sure: string; notKept: string;
  };
  translate: { go: string; swap: string; placeholder: string; empty: string; record: string; stop: string; listen: string; copy: string; copied: string };
  voices: { all: string; listen: string; use: string };
  madeFor: Record<OutputId, string>;
  errors: { generic: string; network: string; big: (mb: number) => string; mic: string };
};

export const createCopy: Record<Lang, CreateCopy> = {
  en: {
    home: {
      question: "What should people hear?", placeholder: "Write or say your message", writtenIn: "Written in", to: "Said in", make: "Make it", again: "New message",
      translating: "Translating…", speaking: "Making the voice…", whatsapp: "Send on WhatsApp", download: "Download",
      searchIdeas: "Search ideas", ideasIn: k => (k === 1 ? "1 idea" : `${k} ideas`), noIdea: "No idea matches.", tryYours: "Try yours", speakIn: l => `Speak in ${l}`, orWrite: l => `or write in ${l}`,
      ideas: "Ideas", recent: "Recent", all: "All", use: "Use", text: "Text", none: "Your messages will show here.", agents: "Agents",
    },
    speak: {
      placeholder: "Write what people should hear", language: "Language", voice: "Voice", madeFor: "Made for", writtenIn: "Written in",
      make: "Make it", again: "Make it again", original: "French", restore: "Back to the French", fix: l => `Fix ${l}`,
      chars: (u, m) => `${u} / ${m}`, tooLong: m => `Up to ${m} characters.`, history: "History", none: "Nothing yet.",
    },
    interpret: {
      lede: (a, b) => `Speak in ${a} or ${b}, and hear it in the other language.`,
      ledeOne: (f, to) => `Speak in ${f}, and hear it in ${to}.`,
      record: "Record", stop: "Stop", cancel: "Cancel", uploadIn: l => `Upload a voice note in ${l}`, upload: "Upload", tryOne: "Or try one", sampleIn: l => `A voice note in ${l}`,
      listening: "Listening…", nothing: "Nothing was heard.", listen: "Listen", share: "Send on WhatsApp",
      history: "History", back: "Interpreter", none: "Your conversations will show here.", fresh: "New conversation", resume: "Continue", removeConv: "Delete the conversation", exchanges: k => (k === 1 ? "1 exchange" : `${k} exchanges`), today: "Today", yesterday: "Yesterday",
      remove: "Delete", sure: "Delete?", notKept: "Not saved: it stays here until you leave the page.",
    },
    translate: { go: "Translate", swap: "Swap the languages", placeholder: "Write or say it", empty: "The translation shows here", record: "Record", stop: "Stop", listen: "Listen", copy: "Copy", copied: "Copied" },
    voices: { all: "All", listen: "Listen", use: "Use" },
    madeFor: { whatsapp: "WhatsApp voice note", radio: "Radio", phone: "Phone line", file: "File" },
    errors: { generic: "Something went wrong. Try again.", network: "No connection. Try again.", big: mb => `Up to ${mb} MB here.`, mic: "The microphone is not available." },
  },
  fr: {
    home: {
      question: `Que doivent-ils entendre${n}?`, placeholder: "Écrivez ou dites votre message", writtenIn: "Écrit en", to: "Dit en", make: "Créer", again: "Nouveau message",
      translating: "Traduction…", speaking: "Création de la voix…", whatsapp: "Envoyer sur WhatsApp", download: "Télécharger",
      searchIdeas: "Rechercher une idée", ideasIn: k => (k === 1 ? "1 idée" : `${k} idées`), noIdea: "Aucune idée ne correspond.", tryYours: "Essayez le vôtre", speakIn: l => `Parlez en ${l.toLowerCase()}`, orWrite: l => `ou écrivez en ${l.toLowerCase()}`,
      ideas: "Idées", recent: "Récents", all: "Tout", use: "Utiliser", text: "Texte", none: "Vos messages s’afficheront ici.", agents: "Agents",
    },
    speak: {
      placeholder: "Écrivez ce que les gens doivent entendre", language: "Langue", voice: "Voix", madeFor: "Pour", writtenIn: "Écrit en",
      make: "Créer", again: "Recréer", original: "Français", restore: "Revenir au français", fix: l => `Corriger ${l}`,
      chars: (u, m) => `${u} / ${m}`, tooLong: m => `${m} caractères au plus.`, history: "Historique", none: "Rien pour l’instant.",
    },
    interpret: {
      lede: (a, b) => `Parlez en ${a.toLowerCase()} ou en ${b.toLowerCase()}, et écoutez-le dans l’autre langue.`,
      ledeOne: (f, to) => `Parlez en ${f.toLowerCase()}, et écoutez-le en ${to.toLowerCase()}.`,
      record: "Enregistrer", stop: "Arrêter", cancel: "Annuler", uploadIn: l => `Importer un vocal en ${l.toLowerCase()}`, upload: "Importer", tryOne: "Ou essayez-en un",
      sampleIn: l => `Un vocal en ${l.toLowerCase()}`,
      listening: "Écoute…", nothing: "Rien n’a été entendu.", listen: "Écouter", share: "Envoyer sur WhatsApp",
      history: "Historique", back: "Interprète", none: "Vos conversations s’afficheront ici.", fresh: "Nouvelle conversation", resume: "Continuer", removeConv: "Supprimer la conversation", exchanges: k => (k === 1 ? "1 échange" : `${k} échanges`), today: "Aujourd’hui", yesterday: "Hier",
      remove: "Supprimer", sure: `Supprimer${n}?`, notKept: `Non enregistré${n}: il reste ici jusqu’à ce que vous quittiez la page.`,
    },
    translate: { go: "Traduire", swap: "Inverser les langues", placeholder: "Écrivez ou dites-le", empty: "La traduction s’affiche ici", record: "Enregistrer", stop: "Arrêter", listen: "Écouter", copy: "Copier", copied: "Copié" },
    voices: { all: "Tout", listen: "Écouter", use: "Utiliser" },
    madeFor: { whatsapp: "Note vocale WhatsApp", radio: "Radio", phone: "Ligne téléphonique", file: "Fichier" },
    errors: { generic: "Un problème est survenu. Réessayez.", network: "Pas de connexion. Réessayez.", big: mb => `${mb}${n}Mo au plus ici.`, mic: "Le micro n’est pas disponible." },
  },
};
