/* Copy for Namu Create's tools (src/components/create): Speak, Transcribe and the Kit. Names and actions only; the
   platform does not explain itself. The starters are French on purpose: organisations write in French, and Speak
   turns the French into the local language before it is spoken.
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication. */
import type { Lang } from "@/i18n/config";

const n = " ";   // narrow no-break space before French high punctuation

export type Starter = { label: string; text: string };

/* The French starter texts, the same in both interfaces (what the organisation would write). */
const STARTERS_FR: string[] = [
  "Dormez chaque nuit sous une moustiquaire imprégnée. Elle protège toute la famille contre le paludisme.",
  "La réunion du comité aura lieu jeudi à seize heures, à la mairie. Votre présence est importante.",
  "Il était une fois, dans un village au bord du fleuve, une vieille femme qui connaissait toutes les histoires.",
  "Aujourd’hui, nous apprenons à compter jusqu’à dix. Répétez après moi : un, deux, trois.",
  "Chers auditeurs, la campagne de vaccination commence lundi dans tous les centres de santé.",
  "Merci de votre confiance. Notre équipe reste à votre écoute tous les jours, de huit heures à dix-huit heures.",
].map(s => s.replace(" :", `${n}:`));

export type CreateCopy = {
  speak: {
    title: string; placeholder: string; startWith: string; starters: Starter[];
    settings: string; history: string; language: string; voice: string; written: string; madeFor: string;
    translate: string; translating: string; generate: string; generating: string; again: string;
    original: string; restore: string; fix: (letters: string) => string; chars: (used: string, max: string) => string;
    download: (target: string, ext: string) => string; empty: string; tooLong: (max: string) => string;
  };
  transcribe: {
    title: string; language: string; listening: string; again: string; copy: string; copied: string; download: string; nothing: string;
  };
  kit: {
    title: string; words: string; voices: string; term: string; say: string; language: string; every: string;
    add: string; remove: string; save: string; saving: string; saved: string; listen: string; termPh: string; sayPh: string;
  };
  errors: { generic: string; network: string; big: (mb: number) => string };
};

export const createCopy: Record<Lang, CreateCopy> = {
  en: {
    speak: {
      title: "Speak", placeholder: "Write what people should hear…", startWith: "Get started with",
      starters: ["Health message", "Announce a meeting", "Tell a folktale", "Explain a lesson", "Radio spot", "Thank your customers"]
        .map((label, i) => ({ label, text: STARTERS_FR[i] })),
      settings: "Settings", history: "History", language: "Language", voice: "Voice", written: "Written in French", madeFor: "Made for",
      translate: "Translate", translating: "Translating…", generate: "Generate", generating: "Generating…", again: "Generate again",
      original: "French", restore: "Back to the French", fix: l => `Fix ${l}`, chars: (u, m) => `${u} / ${m}`,
      download: (t, e) => `${t} · .${e}`, empty: "Nothing yet.", tooLong: m => `Up to ${m} characters.`,
    },
    transcribe: {
      title: "Transcribe", language: "Language", listening: "Listening…", again: "New recording", copy: "Copy", copied: "Copied",
      download: "Download .txt", nothing: "Nothing was heard.",
    },
    kit: {
      title: "Kit", words: "Words", voices: "Voices", term: "Word", say: "Say it as", language: "Language", every: "Every language",
      add: "Add a word", remove: "Remove", save: "Save", saving: "Saving…", saved: "Saved", listen: "Listen", termPh: "UNICEF", sayPh: "Yunisef",
    },
    errors: { generic: "Something went wrong. Try again.", network: "No connection. Try again.", big: mb => `Up to ${mb} MB here.` },
  },
  fr: {
    speak: {
      title: "Parler", placeholder: "Écrivez ce que les gens doivent entendre…", startWith: "Pour commencer",
      starters: ["Message de santé", "Annoncer une réunion", "Raconter un conte", "Expliquer une leçon", "Spot radio", "Remercier vos clients"]
        .map((label, i) => ({ label, text: STARTERS_FR[i] })),
      settings: "Paramètres", history: "Historique", language: "Langue", voice: "Voix", written: "Écrit en français", madeFor: "Pour",
      translate: "Traduire", translating: "Traduction…", generate: "Générer", generating: "Génération…", again: "Générer à nouveau",
      original: "Français", restore: "Revenir au français", fix: l => `Corriger ${l}`, chars: (u, m) => `${u} / ${m}`,
      download: (t, e) => `${t} · .${e}`, empty: "Rien pour l’instant.", tooLong: m => `${m} caractères au plus.`,
    },
    transcribe: {
      title: "Transcrire", language: "Langue", listening: "Écoute…", again: "Nouvel enregistrement", copy: "Copier", copied: "Copié",
      download: "Télécharger .txt", nothing: "Rien n’a été entendu.",
    },
    kit: {
      title: "Kit", words: "Mots", voices: "Voix", term: "Mot", say: "Prononcer", language: "Langue", every: "Toutes les langues",
      add: "Ajouter un mot", remove: "Retirer", save: "Enregistrer", saving: "Enregistrement…", saved: "Enregistré", listen: "Écouter", termPh: "UNICEF", sayPh: "Yunisef",
    },
    errors: { generic: "Un problème est survenu. Réessayez.", network: "Pas de connexion. Réessayez.", big: mb => `${mb}${n}Mo au plus ici.` },
  },
};
