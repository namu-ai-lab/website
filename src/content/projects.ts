/* Copy for Namu Create's home, projects and video translation. Labels and actions only: the platform names things
   and does not describe them. The templates' starter texts are written in French, the language organisations write
   in; each project turns them into the local languages.
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication. */
import type { Lang } from "@/i18n/config";
import type { IconName } from "@/lib/icons";

const n = " ";   // narrow no-break space before French high punctuation

export type Template = { id: string; icon: IconName; title: Record<Lang, string>; text: string };

/* Starter texts, in French (the source a project translates from). */
export const TEMPLATES: Template[] = [
  { id: "health", icon: "care", title: { en: "Health message", fr: "Message de santé" },
    text: "Dormez chaque nuit sous une moustiquaire imprégnée. Elle protège toute la famille contre le paludisme." },
  { id: "lesson", icon: "learn", title: { en: "School lesson", fr: "Leçon" },
    text: `Aujourd’hui, nous apprenons à compter. Répétez après moi${n}: un, deux, trois, quatre, cinq.` },
  { id: "announcement", icon: "civic", title: { en: "Community announcement", fr: "Annonce communautaire" },
    text: "Une réunion du village aura lieu samedi à neuf heures, devant la mairie. Tout le monde est invité." },
  { id: "folktale", icon: "headphones", title: { en: "Folktale", fr: "Conte" },
    text: "Il était une fois, dans un village au bord du fleuve, un vieux conteur que tous les enfants venaient écouter le soir." },
  { id: "customer", icon: "grow", title: { en: "Customer message", fr: "Message client" },
    text: "Merci d’être notre client. Votre commande est prête. Vous pouvez venir la chercher dès demain matin." },
];

export type ProjectsCopy = {
  home: { question: string; placeholder: string; writtenIn: string; dictate: string; stopDictate: string; listening: string; send: string; newProject: string; recents: string; templates: string; none: string };
  list: { newProject: string; none: string; untitled: string };
  editor: {
    back: string; title: string; madeFor: string; downloadAll: string; preparing: string; nothingYet: string; source: string; writtenIn: string;
    translate: string; translating: string; generate: string; generating: string; again: string; placeholder: (lang: string) => string;
    status: { draft: string; review: string; checked: string }; statusLabel: string; deleteProject: string; confirmDelete: string; language: string;
  };
  video: {
    choose: string; another: string; from: string; to: string; translate: string; listening: string; step: (i: number, n: number) => string; speaking: string;
    mixing: string; original: string; translated: string; track: string; subtitles: (lang: string) => string; tooLong: (min: number) => string;
    noSpeech: string; decode: string; stopped: string;
  };
};

export const projectsCopy: Record<Lang, ProjectsCopy> = {
  en: {
    home: {
      question: "What do you want people to hear?", placeholder: "Write or say your message…", writtenIn: "Written in", dictate: "Dictate", stopDictate: "Stop",
      listening: "Listening…", send: "Create", newProject: "New project", recents: "Recents", templates: "Templates", none: "No project yet.",
    },
    list: { newProject: "New project", none: "No project yet.", untitled: "Untitled" },
    editor: {
      back: "Projects", title: "Title", madeFor: "Made for", downloadAll: "Download all", preparing: "Preparing…", nothingYet: "Generate a version first.",
      source: "Source", writtenIn: "Written in", translate: "Translate", translating: "Translating…", generate: "Generate", generating: "Generating…",
      again: "Generate again", placeholder: l => `Text in ${l}`, status: { draft: "Draft", review: "To review", checked: "Checked" }, statusLabel: "Status",
      deleteProject: "Delete project", confirmDelete: "Delete this project?", language: "Language",
    },
    video: {
      choose: "Choose a video", another: "Choose another", from: "From", to: "To", translate: "Translate", listening: "Listening…",
      step: (i, all) => `${i} of ${all}`, speaking: "Speaking…", mixing: "Mixing…", original: "Original", translated: "Translated",
      track: "Sound track", subtitles: l => `Subtitles · ${l}`, tooLong: m => `Up to ${m} minutes.`, noSpeech: "No speech found.",
      decode: "This file cannot be read.", stopped: "Stopped.",
    },
  },
  fr: {
    home: {
      question: `Que voulez-vous faire entendre${n}?`, placeholder: "Écrivez ou dites votre message…", writtenIn: "Écrit en", dictate: "Dicter", stopDictate: "Arrêter",
      listening: "Écoute…", send: "Créer", newProject: "Nouveau projet", recents: "Récents", templates: "Modèles", none: "Aucun projet pour l’instant.",
    },
    list: { newProject: "Nouveau projet", none: "Aucun projet pour l’instant.", untitled: "Sans titre" },
    editor: {
      back: "Projets", title: "Titre", madeFor: "Pour", downloadAll: "Tout télécharger", preparing: "Préparation…", nothingYet: "Générez d’abord une version.",
      source: "Source", writtenIn: "Écrit en", translate: "Traduire", translating: "Traduction…", generate: "Générer", generating: "Génération…",
      again: "Générer à nouveau", placeholder: l => `Texte en ${l}`, status: { draft: "Brouillon", review: "À relire", checked: "Vérifié" }, statusLabel: "Statut",
      deleteProject: "Supprimer le projet", confirmDelete: `Supprimer ce projet${n}?`, language: "Langue",
    },
    video: {
      choose: "Choisir une vidéo", another: "En choisir une autre", from: "De", to: "Vers", translate: "Traduire", listening: "Écoute…",
      step: (i, all) => `${i} sur ${all}`, speaking: "Voix…", mixing: "Mixage…", original: "Original", translated: "Traduit",
      track: "Piste sonore", subtitles: l => `Sous-titres · ${l}`, tooLong: m => `${m} minutes au plus.`, noSpeech: "Aucune parole trouvée.",
      decode: "Ce fichier ne peut pas être lu.", stopped: "Arrêté.",
    },
  },
};
