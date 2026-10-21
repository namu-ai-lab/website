import type { Lang } from "./config";

/* Every interface and page string of the Lab site, in English and French.
   Long-form content lives elsewhere: programmes (content/programmes*.ts), posts and About (content/posts*.tsx).
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication.
   French typography: U+202F (narrow no-break space) before ; : ! ? and inside « ». */

const n = " ";

type Card = { t: string; d: string };
type Fig = { title: string; sub: string; cap: string };

const en = {
  langName: "English",
  meta: {
    site: "Namu AI Lab is the research unit of Namu. We study how machines hear, understand and answer in the languages of the Sahel.",
    research: ["Research", "Namu AI Lab research: five programmes on full-duplex conversation, consented speech data, Zarma, data curation and honest measurement."],
    programmes: ["Programmes", "The five research programmes of Namu AI Lab."],
    data: ["Data", "How Namu AI Lab will collect, clean and measure speech in the languages of the Sahel: with consent, fair pay and a data statement for every release."],
    air: ["Aïr", "Aïr is Namu AI Lab’s research system for full-duplex conversation in the languages of the Sahel: it listens while it speaks."],
    about: ["About", "Namu AI Lab is the research unit of Namu, working on speech in the languages of the Sahel."],
  },
  nav: {
    research: "Research", models: "Models", developers: "Developers", data: "Data", organisations: "Organisations", about: "About", skip: "Skip to main content",
    openMenu: "Open menu", closeMenu: "Close menu", menu: "Menu",
    devIntro: "Build with the Lab’s speech models for the languages of the Sahel.", devCta: "Explore the API",
    apiPlatform: "API platform", apiPlatformSub: "One API for listening, speaking, translation and conversation",
    docs: "API docs", docsSub: "Endpoints, errors and limits, with code to copy",
    apiKeys: "API keys", apiKeysSub: "Sign in to create keys and follow your usage",
    sdks: "Developer SDKs", sdksSub: "Libraries and tools for building with the API", soon: "Coming soon", overview: "Overview", logIn: "Log in", startBuilding: "Start building", language: "Language",
    researchIntro: "Five programmes on how machines hear, understand and answer in the languages of the Sahel.", exploreResearch: "Explore research",
    latest: "Latest research", latestSub: "Posts, notes and methods",
    modelsIntro: "Speech systems for the languages of the Sahel, built on the Lab’s research.", viewModels: "View models",
  },
  common: {
    learnMore: "Learn more", listen: "Listen", previous: "Previous", next: "Next", getInTouch: "Get in touch", viewAll: "View all",
    explore: (name: string) => `Explore ${name}`, minRead: (m: number) => `${m} min read`, share: "Share", copied: "Link copied", inEnglish: "",
  },
  status: { Active: "Active", Opening: "Opening", Starting: "Starting", Paused: "Paused", Concluded: "Concluded", "In research": "In research", "In development": "In development", "Early preview": "Early preview", Available: "Available" } as Record<string, string>,
  topics: { Lab: "Lab", Data: "Data", Measurement: "Measurement", Research: "Research", Story: "Story" } as Record<string, string>,
  models: {
    air: { line: "A voice agent that holds a conversation in the languages of the Sahel", task: "Voice agent", languages: "Languages of the Sahel" },
    kora: { line: "Speech translation between the languages of the Sahel and French", task: "Speech translation", languages: "Languages of the Sahel, French" },
    tatsuniya: { line: "Speech recognition built for the languages of the Sahel", task: "Speech recognition", languages: "Languages of the Sahel" },
    tafiya: { line: "Natural, expressive speech synthesis for the languages of the Sahel", task: "Speech synthesis", languages: "Languages of the Sahel" },
  } as Record<string, { line: string; task: string; languages: string }>,
  footer: {
    follow: "Follow us", tag: "Speech AI that hears everyone", models: "Models", research: "Research", start: "Get started", lab: "The Lab",
    partner: "Partner with us", github: "Code on GitHub", about: "About", news: "News", data: "Data", careers: "Careers", contact: "Contact", email: "Email",
    stay: "Stay connected as we build speech AI for the languages of the Sahel", join: "Sign up for the Lab’s newsletter", build: "Start building",
    aboutNamu: "About Namu", privacy: "Privacy", terms: "Terms",
  },
  home: {
    hero: "Speech AI for the languages of the Sahel",
    featuredLabel: "Featured research and models",
    featured: {
      air: "A voice agent that holds a conversation in the languages of the Sahel",
      hira: "Research into speech models that listen while they speak",
      rumbu: "A consented speech commons for the Sahel, Niger first",
      maauni: "Honest measurement for speech in the languages of the Sahel",
      zarma: "Speech technology for Zarma, from the ground up",
      tankade: "From raw audio to data a model and a reader can trust",
    } as Record<string, string>,
    latest: "Latest news", viewNews: "View news",
    models: "Models", modelsSub: "Speech systems built on our research", modelsLink: "View on namu-ai.org", badge: "Research", statusLabel: "Status",
    research: "Research", researchSub: `Five programmes, one aim: speech technology that works for the people of the Sahel`, researchLink: "Explore research",
  },
  research: {
    eyebrow: "Research", h1: "We study how machines hear, understand and answer in the languages of the Sahel",
    programmes: "Programmes", programmesSub: "Five long-running research efforts, each with its own questions and milestones", viewProgrammes: "View programmes",
    latest: "Latest research",
    bands: {
      hira: ["Two voices, one timeline", "How Aïr is built"], rumbu: ["Who is in Hausa speech data today", "How we will work with data"],
      zarma: ["The questions we are asking", "Where we are"], tankade: ["The life of an utterance", "Where we are"],
      maauni: ["Why we report every Hausa score twice", "Winning the Swahili ASR challenge"],
    } as Record<string, [string, string]>,
    figures: "Explore our figures", figuresSub: "Interactive figures that run in your browser, on real Hausa data",
    demo1: "Score a Hausa transcript strictly, then folded, and see what folding hides", demo1Cta: "Strict and folded",
    demo2: "Every utterance of the FLEURS Hausa test set, and who is speaking", demo2Cta: "The test set",
  },
  programmes: {
    eyebrow: "Programmes", h1: "Five programmes, one aim: speech technology that works for the people of the Sahel",
    all: "All research", allSub: "Posts, notes and interactive figures from every programme.", allCta: "Explore research",
  },
  programme: {
    readQuestions: "Read the questions", seeProgress: "See progress", collaborate: "Collaborate",
    tabs: { overview: "Overview", detail: "In detail", questions: "Questions", progress: "Progress", collaborate: "Collaborate" },
    noClaim: "What we do not claim yet", questions: "Questions", questionsSub: "What this programme sets out to answer",
    progress: "Progress", progressSub: "Dates appear only on finished steps", states: { done: "Done", now: "In progress", next: "Next" },
    release: "What we will release", workWith: (name: string) => `Work with us on ${name}`, reading: "Related reading", more: "More research", allResearch: "All research",
    figures: {
      hira: { title: "Two voices, one timeline", sub: "Full duplex means overlap, backchannels and interruptions. This is how the Lab will show them for every recorded conversation.", cap: "Lines from namu-ai.org’s Aïr page. Timing is illustrative until a consented two-speaker recording is published." },
      rumbu: { title: "Who is in Hausa speech data today", sub: "Every utterance of the FLEURS Hausa test split, in file order, coloured by the gender recorded in the dataset.", cap: "Source: google/fleurs, data/ha_ng/test.tsv, CC BY 4.0, read 12 October 2026." },
      tankade: { title: "The life of an utterance", sub: "Recorded, segmented, aligned, normalised and checked against the speaker’s consent.", cap: "Illustrative audio; the steps are the pipeline’s. Use the numbered steps to walk through it." },
      maauni: { title: "Strict and folded", sub: "One transcript scored two ways, computed in your browser with word-level alignment.", cap: "Folding hooked letters halves this error rate and hides the mistake a Hausa reader notices first." },
    } as Record<string, Fig>,
    overview: {
      hira: [{ t: "An ear", d: "Turns speech into something a language model can read." }, { t: "A brain", d: "A multilingual model, whose weights we do not retrain, decides what to say." }, { t: "A mouth", d: "Built on Kyutai’s Moshi architecture, it speaks while it keeps listening." }],
      rumbu: [{ t: "Conversation", d: "Two people on separate channels, and calls over ordinary phones." }, { t: "Consent", d: "Every speaker chooses what their voice may be used for, and is paid." }, { t: "Coverage", d: "Regional varieties from Niger and Nigeria, including people who do not read." }],
      zarma: [{ t: "Orthography", d: "A normaliser vetted by Zarma writers outside the founding team." }, { t: "A test set first", d: "A few consented hours, verified twice and frozen." }, { t: "Baselines", d: "Existing systems on that test set, scored strict and folded." }],
      tankade: [{ t: "Segment", d: "Cut long broadcasts and field recordings into utterances." }, { t: "Agree", d: "Keep what two recognisers agree on, align it word by word." }, { t: "Repair", d: "Restore hooked letters and spelling, and tag every licence." }],
      maauni: [{ t: "Test sets", d: "Frozen, speaker-disjoint, with their cells and limits stated." }, { t: "Normalisation", d: "Strict and folded forms, published with test cases." }, { t: "Listening", d: "Blind, multi-rater protocols with agreement published." }],
    } as Record<string, Card[]>,
  },
  air: {
    status: "In research", lede: "A voice agent that holds a conversation in the languages of the Sahel. It listens while it speaks, so it can wait, stop or acknowledge.",
    hear: "Hear Aïr", how: "How it works", hira: "The Hira programme",
    statement: "People answer before a sentence ends, say “to” while the other person is still speaking, and stop when interrupted. Aïr is our research into speech that does the same, in the languages of the Sahel.",
    tabs: { listen: "Listen", how: "How it works", conversation: "Conversation", limits: "Limits" },
    listen: "Listen", listenSub: "A greeting in Aïr’s voice, with each word lit as it is spoken.",
    playerLabel: "Aïr · greeting", playerGloss: "Hello, this is Namu. How can I help?",
    playerNote: "The recording will play here once the founders choose the sample and its consent record is published.",
    howSub: "Aïr splits the problem in three: an ear, a brain and a mouth, running as one live chain.",
    parts: [
      { t: "The ear", d: "Turns speech into something a language model can read. Today that is still a transcript." },
      { t: "The brain", d: "A third-party multilingual model, McGill’s AfriqueQwen, decides what to say. We do not retrain its weights." },
      { t: "The mouth", d: "Built on Kyutai’s Moshi architecture, it speaks while it keeps listening." },
    ] as Card[],
    convo: "Two voices, one timeline", convoSub: "Overlap, backchannels and interruptions, drawn the way the Lab will show every recorded conversation.",
    open: "Aïr is built in the open, one measurement at a time", openSub: "The Hira programme publishes the questions, the progress and the results, including what does not work.",
    exploreHira: "Explore Hira", onNamu: "Aïr on namu-ai.org",
  },
  data: {
    eyebrow: "Data", h1: "The languages of the Sahel as people speak them, recorded with their consent",
    lede: "Speech models learn the language they are given. We are building the speech of the Sahel that public datasets leave out, with the people who speak it.",
    rumbu: "The Rumbu programme", measure: "How we measure",
    problem: "Problem", problemH: "Public speech data for the Sahel is narrow", approach: "Our approach", approachH: "Collect it together, with clear rules",
    include: "What our data will include", includeSub: "Rumbu is opening: nothing has been collected yet",
    items: [
      { t: "Two-person conversation", d: "Speakers on separate channels, so overlap, backchannels and interruptions survive for full-duplex research." },
      { t: "Ordinary phone calls", d: "Speech over the phone lines people actually use, as well as apps." },
      { t: "Regional varieties", d: "Speech from Niger, Nigeria and across the Sahel, written in the orthography each country uses." },
      { t: "Frozen test sets", d: "Speaker-disjoint, dialect- and gender-stratified, frozen before training data is collected." },
    ] as Card[],
    notes: "Research", notesSub: "Notes on the data we measure against", moreResearch: "More research", partner: "Partner with us on Rumbu",
  },
  about: {
    eyebrow: "About", how: "How we work", howSub: "Four commitments that come before any result", people: "People", peopleSub: "The Lab is led by Namu’s founders",
    careers: "Help build speech AI for the languages you speak",
  },
  post: { related: "Related posts", artefacts: "Artefacts" },
  notFound: { eyebrow: "Page not found", h1: "This page is not part of the Lab yet", body: "It may have moved, or it may not be written yet.", home: "Home", research: "Research" },
};

export type Copy = typeof en;

const fr: Copy = {
  langName: "Français",
  meta: {
    site: "Namu AI Lab est l’unité de recherche de Namu. Nous étudions comment les machines entendent, comprennent et répondent dans les langues du Sahel.",
    research: ["Recherche", `La recherche de Namu AI Lab${n}: cinq programmes sur la conversation full-duplex, les données de parole consenties, le zarma, la curation des données et la mesure honnête.`],
    programmes: ["Programmes", "Les cinq programmes de recherche de Namu AI Lab."],
    data: ["Données", `Comment Namu AI Lab recueillera, nettoiera et mesurera la parole dans les langues du Sahel${n}: avec consentement, une juste rémunération et une fiche de données pour chaque publication.`],
    air: ["Aïr", `Aïr est le système de recherche de Namu AI Lab pour la conversation full-duplex dans les langues du Sahel${n}: il écoute pendant qu’il parle.`],
    about: ["À propos", "Namu AI Lab est l’unité de recherche de Namu, consacrée à la parole dans les langues du Sahel."],
  },
  nav: {
    research: "Recherche", models: "Modèles", developers: "Développeurs", data: "Données", organisations: "Organisations", about: "À propos", skip: "Aller au contenu principal",
    openMenu: "Ouvrir le menu", closeMenu: "Fermer le menu", menu: "Menu",
    devIntro: "Construisez avec les modèles de parole du Lab pour les langues du Sahel.", devCta: "Découvrir l’API",
    apiPlatform: "Plateforme API", apiPlatformSub: "Une seule API pour écouter, parler, traduire et converser",
    docs: "Documentation de l’API", docsSub: "Points d’accès, erreurs et limites, avec du code à copier",
    apiKeys: "Clés d’API", apiKeysSub: "Connectez-vous pour créer des clés et suivre votre consommation",
    sdks: "SDK pour développeurs", sdksSub: "Des bibliothèques et des outils pour construire avec l’API", soon: "Bientôt", overview: "Vue d’ensemble", logIn: "Se connecter", startBuilding: "Commencer", language: "Langue",
    researchIntro: "Cinq programmes sur la façon dont les machines entendent, comprennent et répondent dans les langues du Sahel.", exploreResearch: "Explorer la recherche",
    latest: "Dernières recherches", latestSub: "Articles, notes et méthodes",
    modelsIntro: "Des systèmes de parole pour les langues du Sahel, issus des recherches du Lab.", viewModels: "Voir les modèles",
  },
  common: {
    learnMore: "En savoir plus", listen: "Écouter", previous: "Précédent", next: "Suivant", getInTouch: "Nous écrire", viewAll: "Tout voir",
    explore: (name: string) => `Découvrir ${name}`, minRead: (m: number) => `${m}${n}min de lecture`, share: "Partager", copied: "Lien copié", inEnglish: "En anglais",
  },
  status: { Active: "Actif", Opening: "En ouverture", Starting: "En démarrage", Paused: "En pause", Concluded: "Terminé", "In research": "En recherche", "In development": "En développement", "Early preview": "Avant-première", Available: "Disponible" },
  topics: { Lab: "Lab", Data: "Données", Measurement: "Mesure", Research: "Recherche", Story: "Récit" },
  models: {
    air: { line: "Un agent vocal qui tient une conversation dans les langues du Sahel", task: "Agent vocal", languages: "Langues du Sahel" },
    kora: { line: "Traduction de la parole entre les langues du Sahel et le français", task: "Traduction de la parole", languages: "Langues du Sahel, français" },
    tatsuniya: { line: "Reconnaissance de la parole conçue pour les langues du Sahel", task: "Reconnaissance de la parole", languages: "Langues du Sahel" },
    tafiya: { line: "Synthèse vocale naturelle et expressive pour les langues du Sahel", task: "Synthèse vocale", languages: "Langues du Sahel" },
  },
  footer: {
    follow: "Suivez-nous", tag: "Une IA de la parole qui entend tout le monde", models: "Modèles", research: "Recherche", start: "Commencer", lab: "Le Lab",
    partner: "Devenez partenaire", github: "Le code sur GitHub", about: "À propos", news: "Actualités", data: "Données", careers: "Carrières", contact: "Contact", email: "E-mail",
    stay: "Restez connectés à notre travail sur l’IA de la parole pour les langues du Sahel", join: "S’inscrire à la newsletter du Lab", build: "Commencer à construire",
    aboutNamu: "À propos de Namu", privacy: "Confidentialité", terms: "Conditions",
  },
  home: {
    hero: "L’IA de la parole pour les langues du Sahel",
    featuredLabel: "Recherches et modèles à la une",
    featured: {
      air: "Un agent vocal qui tient une conversation dans les langues du Sahel",
      hira: "Des modèles de parole qui écoutent pendant qu’ils parlent",
      rumbu: "Un fonds commun de parole du Sahel, constitué avec consentement, au Niger d’abord",
      maauni: "Une mesure honnête pour la parole dans les langues du Sahel",
      zarma: "Des technologies de la parole pour le zarma, à partir de zéro",
      tankade: "De l’audio brut à des données dignes de confiance, pour un modèle comme pour un lecteur",
    },
    latest: "Dernières actualités", viewNews: "Toutes les actualités",
    models: "Modèles", modelsSub: "Des systèmes de parole issus de nos recherches", modelsLink: "Voir sur namu-ai.org", badge: "Recherche", statusLabel: "Statut",
    research: "Recherche", researchSub: `Cinq programmes, un seul but${n}: des technologies de la parole qui fonctionnent pour les populations du Sahel`, researchLink: "Explorer la recherche",
  },
  research: {
    eyebrow: "Recherche", h1: "Nous étudions comment les machines entendent, comprennent et répondent dans les langues du Sahel",
    programmes: "Programmes", programmesSub: "Cinq efforts de recherche au long cours, chacun avec ses questions et ses étapes", viewProgrammes: "Voir les programmes",
    latest: "Dernières recherches",
    bands: {
      hira: ["Deux voix, une même ligne de temps", "Comment Aïr est construit"], rumbu: ["Qui parle dans les données hausa aujourd’hui", "Comment nous travaillerons avec les données"],
      zarma: ["Les questions que nous posons", "Où nous en sommes"], tankade: ["La vie d’un énoncé", "Où nous en sommes"],
      maauni: ["Pourquoi nous publions chaque score hausa deux fois", "Le défi ASR en swahili"],
    },
    figures: "Explorer nos figures", figuresSub: "Des figures interactives qui s’exécutent dans votre navigateur, sur de vraies données hausa",
    demo1: "Notez une transcription hausa en mode strict, puis replié, et voyez ce que le repliement cache", demo1Cta: "Strict et replié",
    demo2: "Chaque énoncé du jeu de test hausa de FLEURS, et qui parle", demo2Cta: "Le jeu de test",
  },
  programmes: {
    eyebrow: "Programmes", h1: `Cinq programmes, un seul but${n}: des technologies de la parole qui fonctionnent pour les populations du Sahel`,
    all: "Toute la recherche", allSub: "Articles, notes et figures interactives de chaque programme.", allCta: "Explorer la recherche",
  },
  programme: {
    readQuestions: "Lire les questions", seeProgress: "Voir l’avancement", collaborate: "Collaborer",
    tabs: { overview: "Vue d’ensemble", detail: "En détail", questions: "Questions", progress: "Avancement", collaborate: "Collaborer" },
    noClaim: "Ce que nous n’affirmons pas encore", questions: "Questions", questionsSub: "Ce que ce programme cherche à établir",
    progress: "Avancement", progressSub: "Seules les étapes terminées sont datées", states: { done: "Fait", now: "En cours", next: "À venir" },
    release: "Ce que nous publierons", workWith: (name: string) => `Travaillez avec nous sur ${name}`, reading: "Lectures", more: "Autres recherches", allResearch: "Toute la recherche",
    figures: {
      hira: { title: "Deux voix, une même ligne de temps", sub: "Le full-duplex, ce sont des chevauchements, des signaux d’écoute et des interruptions. Voici comment le Lab les montrera pour chaque conversation enregistrée.", cap: "Répliques tirées de la page Aïr de namu-ai.org. Le minutage est illustratif tant qu’aucun enregistrement consenti à deux voix n’est publié." },
      rumbu: { title: "Qui parle dans les données hausa aujourd’hui", sub: "Chaque énoncé de la partie test hausa de FLEURS, dans l’ordre du fichier, coloré selon le genre indiqué dans le jeu de données.", cap: `Source${n}: google/fleurs, data/ha_ng/test.tsv, CC BY 4.0, consulté le 12 octobre 2026.` },
      tankade: { title: "La vie d’un énoncé", sub: "Enregistré, segmenté, aligné, normalisé et vérifié au regard du consentement du locuteur.", cap: `Audio illustratif${n}; les étapes sont celles de la chaîne de traitement. Parcourez-la avec les étapes numérotées.` },
      maauni: { title: "Strict et replié", sub: "Une même transcription notée de deux façons, calculée dans votre navigateur avec un alignement mot à mot.", cap: "Replier les lettres crochetées divise ce taux d’erreur par deux et masque la faute qu’un lecteur hausa remarque en premier." },
    },
    overview: {
      hira: [{ t: "Une oreille", d: "Transforme la parole en quelque chose qu’un modèle de langage peut lire." }, { t: "Un cerveau", d: "Un modèle multilingue, dont nous ne réentraînons pas les poids, décide quoi dire." }, { t: "Une bouche", d: "Construite sur l’architecture Moshi de Kyutai, elle parle tout en continuant d’écouter." }],
      rumbu: [{ t: "Conversation", d: "Deux personnes sur des canaux séparés, et des appels sur des téléphones ordinaires." }, { t: "Consentement", d: "Chaque locuteur choisit les usages de sa voix, et il est rémunéré." }, { t: "Couverture", d: "Des variétés régionales du Niger et du Nigeria, y compris des personnes qui ne lisent pas." }],
      zarma: [{ t: "Orthographe", d: "Un normaliseur validé par des auteurs zarma extérieurs à l’équipe fondatrice." }, { t: "D’abord un jeu de test", d: "Quelques heures consenties, vérifiées deux fois et figées." }, { t: "Références", d: "Les systèmes existants sur ce jeu de test, notés en strict et en replié." }],
      tankade: [{ t: "Segmenter", d: "Découper les longues émissions et les enregistrements de terrain en énoncés." }, { t: "Recouper", d: "Garder ce sur quoi deux systèmes de reconnaissance s’accordent, et l’aligner mot à mot." }, { t: "Réparer", d: "Restaurer les lettres crochetées et l’orthographe, et étiqueter chaque licence." }],
      maauni: [{ t: "Jeux de test", d: "Figés, sans locuteurs communs, avec leurs catégories et leurs limites indiquées." }, { t: "Normalisation", d: "Formes strictes et repliées, publiées avec des cas de test." }, { t: "Écoute", d: "Des protocoles à l’aveugle, à plusieurs évaluateurs, avec leur accord publié." }],
    },
  },
  air: {
    status: "En recherche", lede: "Un agent vocal qui tient une conversation dans les langues du Sahel. Il écoute pendant qu’il parle, et peut donc attendre, s’arrêter ou acquiescer.",
    hear: "Écouter Aïr", how: "Fonctionnement", hira: "Le programme Hira",
    statement: `Les gens répondent avant la fin d’une phrase, disent «${n}to${n}» pendant que l’autre parle encore, et s’arrêtent quand on les interrompt. Aïr est notre recherche sur une parole artificielle qui fait de même, dans les langues du Sahel.`,
    tabs: { listen: "Écouter", how: "Fonctionnement", conversation: "Conversation", limits: "Limites" },
    listen: "Écouter", listenSub: "Une salutation avec la voix d’Aïr, chaque mot s’allumant au moment où il est prononcé.",
    playerLabel: "Aïr · salutation", playerGloss: `Bonjour, ici Namu. Comment puis-je vous aider${n}?`,
    playerNote: "L’enregistrement sera diffusé ici une fois que les fondateurs auront choisi l’extrait et publié son attestation de consentement.",
    howSub: `Aïr découpe le problème en trois${n}: une oreille, un cerveau et une bouche, qui fonctionnent en une seule chaîne, en direct.`,
    parts: [
      { t: "L’oreille", d: "Transforme la parole en quelque chose qu’un modèle de langage peut lire. Aujourd’hui, c’est encore une transcription." },
      { t: "Le cerveau", d: "Un modèle multilingue tiers, AfriqueQwen de McGill, décide quoi dire. Nous ne réentraînons pas ses poids." },
      { t: "La bouche", d: "Construite sur l’architecture Moshi de Kyutai, elle parle tout en continuant d’écouter." },
    ],
    convo: "Deux voix, une même ligne de temps", convoSub: "Chevauchements, signaux d’écoute et interruptions, dessinés comme le Lab montrera chaque conversation enregistrée.",
    open: "Aïr se construit au grand jour, une mesure après l’autre", openSub: "Le programme Hira publie les questions, l’avancement et les résultats, y compris ce qui ne fonctionne pas.",
    exploreHira: "Découvrir Hira", onNamu: "Aïr sur namu-ai.org",
  },
  data: {
    eyebrow: "Données", h1: "Les langues du Sahel telles qu’on les parle, enregistrées avec le consentement des locuteurs",
    lede: "Les modèles de parole apprennent la langue qu’on leur donne. Nous construisons la parole du Sahel que les jeux de données publics laissent de côté, avec celles et ceux qui la parlent.",
    rumbu: "Le programme Rumbu", measure: "Notre façon de mesurer",
    problem: "Le problème", problemH: "Les données publiques de parole du Sahel sont étroites", approach: "Notre approche", approachH: "La recueillir ensemble, avec des règles claires",
    include: "Ce que comprendront nos données", includeSub: `Rumbu est en ouverture${n}: rien n’a encore été collecté`,
    items: [
      { t: "Conversation à deux", d: "Des locuteurs sur des canaux séparés, pour que chevauchements, signaux d’écoute et interruptions restent exploitables pour la recherche full-duplex." },
      { t: "Appels téléphoniques ordinaires", d: "La parole sur les lignes téléphoniques que les gens utilisent réellement, ainsi que sur des applications." },
      { t: "Variétés régionales", d: "La parole du Niger, du Nigeria et de tout le Sahel, écrite dans l’orthographe de chaque pays." },
      { t: "Jeux de test figés", d: "Sans locuteurs communs, stratifiés par dialecte et par genre, figés avant la collecte des données d’entraînement." },
    ],
    notes: "Recherche", notesSub: "Notes sur les données qui nous servent de référence", moreResearch: "Plus de recherches", partner: "Devenez partenaire de Rumbu",
  },
  about: {
    eyebrow: "À propos", how: "Notre façon de travailler", howSub: "Quatre engagements qui passent avant tout résultat", people: "L’équipe", peopleSub: "Le Lab est dirigé par les fondateurs de Namu",
    careers: "Construisez avec nous l’IA de la parole pour les langues que vous parlez",
  },
  post: { related: "Articles liés", artefacts: "Ressources" },
  notFound: { eyebrow: "Page introuvable", h1: "Cette page ne fait pas encore partie du Lab", body: "Elle a peut-être été déplacée, ou elle n’est pas encore écrite.", home: "Accueil", research: "Recherche" },
};

export const copy: Record<Lang, Copy> = { en, fr };
export const t = (lang: Lang) => copy[lang];
