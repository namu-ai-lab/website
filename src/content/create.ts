/* Copy for Namu Create (src/components/create): Home, Voice message, Read a voice note, Translate and Voices. Names
   and actions only; the platform does not explain itself. The pages' names are in content/platform.ts (nav).
   French: read and approved by the founder on 2026-11-01. */
import type { Lang } from "@/i18n/config";
import type { OutputId } from "@/lib/catalog";

const n = " ";   // narrow no-break space before French high punctuation

export type CreateCopy = {
  home: {
    question: string; placeholder: string; writtenIn: string; to: string; make: string; again: string;
    translating: string; speaking: string; whatsapp: string; download: string;
    allIdeas: (n: number) => string; speakIn: (name: string) => string; orWrite: (name: string) => string;
    ideas: string; recent: string; all: string; use: string; text: string; none: string; agents: string;
  };
  speak: {
    placeholder: string; language: string; voice: string; madeFor: string; writtenIn: string; make: string; again: string;
    original: string; restore: string; fix: (letters: string) => string; chars: (used: string, max: string) => string; tooLong: (max: string) => string;
    history: string; none: string;
  };
  read: {
    record: string; stop: string; upload: string; tryOne: string; readIt: string; listening: string; nothing: string;
    listen: string; copy: string; copied: string; again: string; today: string;
  };
  translate: { go: string; swap: string; placeholder: string; empty: string; record: string; stop: string; listen: string; copy: string; copied: string; try: string };
  voices: { all: string; listen: string; use: string };
  madeFor: Record<OutputId, string>;
  errors: { generic: string; network: string; big: (mb: number) => string; mic: string };
};

export const createCopy: Record<Lang, CreateCopy> = {
  en: {
    home: {
      question: "What should people hear?", placeholder: "Write or say your message", writtenIn: "Written in", to: "Said in", make: "Make it", again: "New message",
      translating: "Translating…", speaking: "Making the voice…", whatsapp: "Send on WhatsApp", download: "Download",
      allIdeas: k => `Show all ${k} ideas`, speakIn: l => `Speak in ${l}`, orWrite: l => `or write in ${l}`,
      ideas: "Ideas", recent: "Recent", all: "All", use: "Use", text: "Text", none: "Your messages will show here.", agents: "Agents",
    },
    speak: {
      placeholder: "Write what people should hear", language: "Language", voice: "Voice", madeFor: "Made for", writtenIn: "Written in",
      make: "Make it", again: "Make it again", original: "French", restore: "Back to the French", fix: l => `Fix ${l}`,
      chars: (u, m) => `${u} / ${m}`, tooLong: m => `Up to ${m} characters.`, history: "History", none: "Nothing yet.",
    },
    read: {
      record: "Record", stop: "Stop", upload: "Upload a voice note", tryOne: "Or try one", readIt: "Read it", listening: "Listening…",
      nothing: "Nothing was heard.", listen: "Listen", copy: "Copy", copied: "Copied", again: "New voice note", today: "Today",
    },
    translate: { go: "Translate", swap: "Swap the languages", placeholder: "Write or say it", empty: "The translation shows here", record: "Record", stop: "Stop", listen: "Listen", copy: "Copy", copied: "Copied", try: "Try" },
    voices: { all: "All", listen: "Listen", use: "Use" },
    madeFor: { whatsapp: "WhatsApp voice note", radio: "Radio", phone: "Phone line", file: "File" },
    errors: { generic: "Something went wrong. Try again.", network: "No connection. Try again.", big: mb => `Up to ${mb} MB here.`, mic: "The microphone is not available." },
  },
  fr: {
    home: {
      question: `Que doivent-ils entendre${n}?`, placeholder: "Écrivez ou dites votre message", writtenIn: "Écrit en", to: "Dit en", make: "Créer", again: "Nouveau message",
      translating: "Traduction…", speaking: "Création de la voix…", whatsapp: "Envoyer sur WhatsApp", download: "Télécharger",
      allIdeas: k => `Voir les ${k} idées`, speakIn: l => `Parlez en ${l.toLowerCase()}`, orWrite: l => `ou écrivez en ${l.toLowerCase()}`,
      ideas: "Idées", recent: "Récents", all: "Tout", use: "Utiliser", text: "Texte", none: "Vos messages s’afficheront ici.", agents: "Agents",
    },
    speak: {
      placeholder: "Écrivez ce que les gens doivent entendre", language: "Langue", voice: "Voix", madeFor: "Pour", writtenIn: "Écrit en",
      make: "Créer", again: "Recréer", original: "Français", restore: "Revenir au français", fix: l => `Corriger ${l}`,
      chars: (u, m) => `${u} / ${m}`, tooLong: m => `${m} caractères au plus.`, history: "Historique", none: "Rien pour l’instant.",
    },
    read: {
      record: "Enregistrer", stop: "Arrêter", upload: "Importer un message vocal", tryOne: "Ou essayez-en un", readIt: "Lire", listening: "Écoute…",
      nothing: "Rien n’a été entendu.", listen: "Écouter", copy: "Copier", copied: "Copié", again: "Nouveau message vocal", today: "Aujourd’hui",
    },
    translate: { go: "Traduire", swap: "Inverser les langues", placeholder: "Écrivez ou dites-le", empty: "La traduction s’affiche ici", record: "Enregistrer", stop: "Arrêter", listen: "Écouter", copy: "Copier", copied: "Copié", try: "Essayer" },
    voices: { all: "Tout", listen: "Écouter", use: "Utiliser" },
    madeFor: { whatsapp: "Note vocale WhatsApp", radio: "Radio", phone: "Ligne téléphonique", file: "Fichier" },
    errors: { generic: "Un problème est survenu. Réessayez.", network: "Pas de connexion. Réessayez.", big: mb => `${mb}${n}Mo au plus ici.`, mic: "Le micro n’est pas disponible." },
  },
};
