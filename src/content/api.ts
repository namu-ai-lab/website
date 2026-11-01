/* The API landing page (/api), redesigned 2026-10-28 after elevenlabs.io: a framed column with hairline rules, a
   showcase that plays each model's real output at once (no cold start), the models as API rows with their code,
   the way in, the console, the beta's terms, the Lab's commitments, questions and the way in once more.
   Claims gate: the API is in beta, open to anyone who signs up, free within 30 minutes of audio a month; every model
   is "In development" or "In research"; no prices, customers, compliance badges or benchmark numbers. Every limit
   is the gateway's (src/lib/limits.ts). What the showcase plays is recorded model output (public/demo,
   public/usecases, public/converse, each with a README saying how it was made); the transcript and the translation
   are what Tatsuniya and Kora returned, unedited. The Lab's commitments are written as what is true today, and
   Rumbu's as what it will do once it opens.
   Positioning (founder, 2026-10-15): the languages of the Sahel, never Hausa alone; Hausa is where the models are today.
   HA-REVIEW: the Hausa lines need a native speaker's check.
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication. */
import type { Lang } from "@/i18n/config";
import { formatNumber } from "@/i18n/format";
import { LIMITS } from "@/lib/limits";
import { MAX_ACTIVE_KEYS } from "@/lib/key-shape";

const n = " ";   // narrow no-break space before French high punctuation
const fr = (s: string) => s.replace(/ ([:;!?»])/g, `${n}$1`).replace(/« /g, `«${n}`);

export type ApiTask = "speech" | "transcribe" | "translate" | "converse";
export const API_TASKS: ApiTask[] = ["speech", "transcribe", "translate", "converse"];
export const ENDPOINT: Record<ApiTask, string> = { speech: "/v1/speech", transcribe: "/v1/transcribe", translate: "/v1/translate", converse: "/v1/converse" };
/* each model's dot, on the showcase's tabs and the model rows: colours from its orb's palette */
export const TASK_DOT: Record<ApiTask, string> = { speech: "#ec6b80", transcribe: "#c4865a", translate: "#7c9bd2", converse: "#e8935a" };

export type ApiModel = { task: ApiTask; name: string; job: string; desc: string; langs: string; limit: string; status: string; research?: boolean };

export type ApiCopy = {
  meta: [string, string];
  eyebrow: string; h1: string; lede: string; start: string; docs: string;
  show: {
    label: string; tabs: Record<ApiTask, string>; play: string; stop: string; previous: string; next: string; voices: string; examples: string;
    wrote: string; asked: string; translated: string; research: string; call: string; own: string; recorded: string;
  };
  proof: [string, string][];
  modelsEyebrow: string; modelsH: string; modelsSub: string; modelsCta: string;
  labels: { endpoint: string; langs: string; limit: string; status: string };
  models: ApiModel[];
  copy: string; copied: string; copyFailed: string;
  stepsEyebrow: string; stepsH: string; stepsSub: string; steps: { t: string; d: string }[];
  mock: { google: string; github: string; email: string; save: string; saveNote: string; done: string; ok: string };
  consoleEyebrow: string; consoleH: string; consoleSub: string; consoleCta: string;
  consoleShots: { home: string; usage: string }; consoleNote: string;
  consoleCards: { icon: "key" | "chart" | "logs" | "sliders"; t: string; d: string }[];
  betaEyebrow: string; freeH: string; freeSub: string; allowance: [string, string, string]; limits: [string, string][]; more: string; pricing: string;
  careEyebrow: string; careH: string; careSub: string; care: { t: string; d: string; href: string; cta: string }[];
  faqH: string; faq: [string, string][];
  endH: string; endSub: string;
};

const en: ApiCopy = {
  meta: ["API", "The Namu API, in beta: the Lab’s speech models for the languages of the Sahel, starting with Hausa. Transcribe, speak, translate and converse through one API, free during the beta."],
  eyebrow: "Namu API · Beta",
  h1: "Build voice products for the Sahel",
  lede: "Speech to text, text to speech, translation and conversation in Hausa, through one API. Free while we are in beta.",
  start: "Get an API key", docs: "Read the docs",
  show: {
    label: "Hear the models",
    tabs: { speech: "Text to speech", transcribe: "Speech to text", translate: "Translation", converse: "Conversation" },
    play: "Play", stop: "Stop", previous: "Previous voice", next: "Next voice", voices: "Voices", examples: "Examples",
    wrote: "Tatsuniya wrote", asked: "Asked in Hausa", translated: "Kora answered, in French", research: "In research", call: "Try a live call", own: "Try your own text",
    recorded: "Real output from the models, recorded through the API",
  },
  proof: [["4", "speech models, one API"], ["1 key", "for every model and endpoint"], ["30 min", "of free audio every month"], ["Hausa", "today, with French for translation"]],
  modelsEyebrow: "Models",
  modelsH: "One key, four models",
  modelsSub: "Each model does one job on its own endpoint. The same key calls them all, with the same limits and the same shape for every error.",
  modelsCta: "Explore the docs",
  labels: { endpoint: "Endpoint", langs: "Languages", limit: "Per request", status: "Status" },
  models: [
    { task: "speech", name: "Tafiya", job: "Text to speech", desc: "Turns Hausa text into natural speech, in a female voice, and returns a WAV file.",
      langs: "Hausa", limit: `Up to ${formatNumber("en", LIMITS.textChars)} characters`, status: "In development" },
    { task: "transcribe", name: "Tatsuniya", job: "Speech to text", desc: "Writes down what was said in Hausa’s own alphabet, hooked letters included (ɓ ɗ ƙ ƴ).",
      langs: "Hausa", limit: `Up to ${LIMITS.uploadMb} MB or ${LIMITS.audioMinutes} minutes of audio`, status: "In development" },
    { task: "translate", name: "Kora", job: "Speech translation", desc: "Hears Hausa and answers in French, or the other way round, as text; answers in Hausa can also be spoken.",
      langs: "Hausa ⇄ French", limit: `Up to ${LIMITS.uploadMb} MB or ${LIMITS.audioMinutes} minutes of audio`, status: "In development" },
    { task: "converse", name: "Aïr", job: "Spoken conversation", desc: "One spoken turn per call: Aïr hears and answers aloud. Each call stands alone; no conversation is kept.",
      langs: "Hausa", limit: "One spoken turn", status: "In research", research: true },
  ],
  copy: "Copy", copied: "Copied", copyFailed: "Not copied: the text is selected",
  stepsEyebrow: "Get started",
  stepsH: "From sign-up to first sound",
  stepsSub: "Three steps and a few minutes. No card, no waiting list.",
  steps: [
    { t: "Create an account", d: "With your email, Google or GitHub. Your account can create keys straight away." },
    { t: "Create a key", d: "Name it, choose which models it may call, and copy it once. We keep only a fingerprint of it." },
    { t: "Make a request", d: "Export the key and send your first Hausa sentence. It shows up in your console’s logs." },
  ],
  mock: { google: "Continue with Google", github: "Continue with GitHub", email: "Email address", save: "Save your key", saveNote: "You won’t see it again.", done: "Done", ok: "200 OK · speech.wav" },
  consoleEyebrow: "Console",
  consoleH: "A console for every key",
  consoleSub: "Keys, usage, logs and a playground for every model, organised like the developer consoles you already know.",
  consoleCta: "Open the console",
  consoleShots: { home: "The console’s Home: getting started, the month’s usage, recent requests and the models.", usage: "The console’s Usage page: requests per day by model." },
  consoleNote: "Sample data.",
  consoleCards: [
    { icon: "key", t: "Keys", d: "Name them, limit them to some models, revoke them at once." },
    { icon: "chart", t: "Usage", d: "By model or by key, day by day, with a CSV export." },
    { icon: "logs", t: "Logs", d: "Every request with its status and latency. Never the audio or the text." },
    { icon: "sliders", t: "Playground", d: "Every model on your own account, without writing code." },
  ],
  betaEyebrow: "Pricing",
  freeH: "Free while we are in beta",
  freeSub: "Every account gets the same allowance. Build, test and pilot on it, and write to us when you need more.",
  allowance: ["30", "minutes of audio a month", "The audio you send counts, and for text to speech, the speech you get back. It resets on the 1st (UTC)."],
  limits: [
    [`${LIMITS.keyPerMin}`, "requests a minute, per key"],
    [`${LIMITS.uploadMb} MB`, `or ${LIMITS.audioMinutes} minutes per audio file`],
    [formatNumber("en", LIMITS.textChars), "characters per speech request"],
    [`${MAX_ACTIVE_KEYS}`, "active keys per account"],
  ],
  more: "Need more? Write to us", pricing: "Pricing will be published with each model’s release.",
  careEyebrow: "Responsibility",
  careH: "Built with care",
  careSub: "What stands behind every endpoint, said plainly.",
  care: [
    { t: "Measured honestly", d: "We report every Hausa score twice, strict and folded, so you can see what spelling costs.", href: "/research/why-we-report-every-hausa-score-twice", cta: "How we score speech" },
    { t: "Consent before data", d: "Rumbu, the Lab’s speech commons, is opening. Its speakers will know how their voice is used, be paid for their time and be free to withdraw.", href: "/programmes/rumbu", cta: "About Rumbu" },
    { t: "Your requests stay yours", d: "We keep usage records: the model, the time, the length and the status. Your logs never hold the audio or the text.", href: "/docs", cta: "Read the docs" },
  ],
  faqH: "Questions",
  faq: [
    ["Which languages does the API cover?", "Hausa today, with French for translation. The Lab works on the languages of the Sahel one at a time; its Zarma programme is starting, and a language reaches the API once its models are measured and released."],
    ["Is it free?", "Yes, during the beta. Every account gets 30 minutes of audio a month, reset on the first of each month (UTC). Pricing will be published with each model’s release."],
    ["What counts towards the allowance?", "Audio minutes: the audio you send, and for text to speech, the speech you get back. Every response tells you how much it counted, and the console adds it up."],
    ["What are the rate limits?", `${LIMITS.keyPerMin} requests a minute per key. Over that, the API answers 429 with a Retry-After header telling you how long to wait.`],
    ["What do you keep from my requests?", "Usage records: which model, when, how much audio, how long it took and the status code. The console’s logs never hold the audio or the text."],
    ["Is it ready for production?", "It is a beta: endpoints may change, and every model is in development or in research. Build prototypes and pilots now, and talk to us before you put it in front of many people."],
    ["Are there SDKs?", "Not yet. The API is plain HTTPS with JSON, and the docs show every call in cURL, Python and JavaScript."],
    ["Does it stream?", "Not yet: each request returns a whole result. Streaming for live agents is planned."],
  ],
  endH: "Your first request is free",
  endSub: "Sign up, create a key, and hear Hausa from your own code.",
};

const frCopy: ApiCopy = {
  meta: ["API", fr("L’API de Namu, en bêta : les modèles de parole du Lab pour les langues du Sahel, à commencer par le hausa. Transcrire, parler, traduire et converser avec une seule API, gratuite pendant la bêta.")],
  eyebrow: "API Namu · Bêta",
  h1: "Créez des produits vocaux pour le Sahel",
  lede: "Parole vers texte, texte vers parole, traduction et conversation en hausa, avec une seule API. Gratuite pendant la bêta.",
  start: "Obtenir une clé d’API", docs: "Lire la documentation",
  show: {
    label: "Écouter les modèles",
    tabs: { speech: "Texte vers parole", transcribe: "Parole vers texte", translate: "Traduction", converse: "Conversation" },
    play: "Écouter", stop: "Arrêter", previous: "Voix précédente", next: "Voix suivante", voices: "Voix", examples: "Exemples",
    wrote: "Tatsuniya a écrit", asked: "Question en hausa", translated: "Kora a répondu, en français", research: "En recherche", call: "Essayer un appel en direct", own: "Essayer votre propre texte",
    recorded: "De vraies sorties des modèles, enregistrées avec l’API",
  },
  proof: [["4", "modèles de parole, une API"], ["1 clé", "pour chaque modèle et point d’accès"], ["30 min", "d’audio gratuites chaque mois"], ["Hausa", "aujourd’hui, avec le français pour la traduction"]],
  modelsEyebrow: "Modèles",
  modelsH: "Une clé, quatre modèles",
  modelsSub: "Chaque modèle fait un seul travail, sur son propre point d’accès. La même clé les appelle tous, avec les mêmes limites et la même forme pour chaque erreur.",
  modelsCta: "Explorer la documentation",
  labels: { endpoint: "Point d’accès", langs: "Langues", limit: "Par requête", status: "Statut" },
  models: [
    { task: "speech", name: "Tafiya", job: "Texte vers parole", desc: "Transforme un texte en hausa en parole naturelle, avec une voix féminine, et renvoie un fichier WAV.",
      langs: "Hausa", limit: `Jusqu’à ${formatNumber("fr", LIMITS.textChars)} caractères`, status: "En développement" },
    { task: "transcribe", name: "Tatsuniya", job: "Parole vers texte", desc: "Écrit ce qui a été dit dans l’alphabet du hausa, lettres crochetées comprises (ɓ ɗ ƙ ƴ).",
      langs: "Hausa", limit: `Jusqu’à ${LIMITS.uploadMb} Mo ou ${LIMITS.audioMinutes} minutes d’audio`, status: "En développement" },
    { task: "translate", name: "Kora", job: "Traduction de la parole", desc: fr("Entend le hausa et répond en français, ou l’inverse, en texte ; les réponses en hausa peuvent aussi être dites à voix haute."),
      langs: "Hausa ⇄ français", limit: `Jusqu’à ${LIMITS.uploadMb} Mo ou ${LIMITS.audioMinutes} minutes d’audio`, status: "En développement" },
    { task: "converse", name: "Aïr", job: "Conversation parlée", desc: fr("Un tour de parole par appel : Aïr entend et répond à voix haute. Chaque appel est indépendant ; aucune conversation n’est conservée."),
      langs: "Hausa", limit: "Un tour de parole", status: "En recherche", research: true },
  ],
  copy: "Copier", copied: "Copié", copyFailed: `Non copié${n}: le texte est sélectionné`,
  stepsEyebrow: "Commencer",
  stepsH: "De l’inscription au premier son",
  stepsSub: "Trois étapes et quelques minutes. Sans carte, sans liste d’attente.",
  steps: [
    { t: "Créer un compte", d: "Avec votre e-mail, Google ou GitHub. Votre compte peut créer des clés aussitôt." },
    { t: "Créer une clé", d: fr("Nommez-la, choisissez les modèles qu’elle peut appeler et copiez-la une fois : nous n’en gardons qu’une empreinte.") },
    { t: "Faire une requête", d: "Exportez la clé et envoyez votre première phrase en hausa. Elle apparaît dans les journaux de votre console." },
  ],
  mock: { google: "Continuer avec Google", github: "Continuer avec GitHub", email: "Adresse e-mail", save: "Enregistrez votre clé", saveNote: "Vous ne la reverrez plus.", done: "Terminé", ok: "200 OK · speech.wav" },
  consoleEyebrow: "Console",
  consoleH: "Une console pour chaque clé",
  consoleSub: "Clés, consommation, journaux et un bac à sable pour chaque modèle, organisés comme les consoles de développeur que vous connaissez.",
  consoleCta: "Ouvrir la console",
  consoleShots: { home: fr("L’accueil de la console : prise en main, consommation du mois, dernières requêtes et modèles."), usage: "La page Consommation de la console : requêtes par jour et par modèle." },
  consoleNote: "Données d’exemple.",
  consoleCards: [
    { icon: "key", t: "Clés", d: "Nommez-les, limitez-les à certains modèles, révoquez-les aussitôt." },
    { icon: "chart", t: "Consommation", d: "Par modèle ou par clé, jour après jour, avec un export CSV." },
    { icon: "logs", t: "Journaux", d: "Chaque requête avec son statut et sa latence. Jamais l’audio ni le texte." },
    { icon: "sliders", t: "Bac à sable", d: "Chaque modèle sur votre propre compte, sans écrire de code." },
  ],
  betaEyebrow: "Tarifs",
  freeH: "Gratuit pendant la bêta",
  freeSub: "Chaque compte reçoit le même quota. Construisez, testez et menez des pilotes avec, et écrivez-nous quand il vous en faut plus.",
  allowance: ["30", "minutes d’audio par mois", "L’audio envoyé compte, et pour la synthèse vocale, la parole reçue. Remis à zéro le 1er (UTC)."],
  limits: [
    [`${LIMITS.keyPerMin}`, "requêtes par minute, par clé"],
    [`${LIMITS.uploadMb} Mo`, `ou ${LIMITS.audioMinutes} minutes par fichier audio`],
    [formatNumber("fr", LIMITS.textChars), "caractères par requête de synthèse"],
    [`${MAX_ACTIVE_KEYS}`, "clés actives par compte"],
  ],
  more: `Besoin de plus${n}? Écrivez-nous`, pricing: "Les tarifs seront publiés avec chaque modèle.",
  careEyebrow: "Responsabilité",
  careH: "Construit avec soin",
  careSub: "Ce qui se tient derrière chaque point d’accès, dit simplement.",
  care: [
    { t: "Mesuré honnêtement", d: fr("Nous donnons chaque score en hausa deux fois, en strict et en replié, pour montrer ce que coûte l’orthographe."), href: "/research/why-we-report-every-hausa-score-twice", cta: "Comment nous évaluons la parole" },
    { t: "Le consentement d’abord", d: fr("Rumbu, le commun de parole du Lab, ouvre bientôt. Ses locuteurs sauront comment leur voix est utilisée, seront rémunérés pour leur temps et libres de se retirer."), href: "/programmes/rumbu", cta: "À propos de Rumbu" },
    { t: "Vos requêtes restent à vous", d: fr("Nous gardons des relevés de consommation : le modèle, l’heure, la durée et le statut. Vos journaux ne contiennent jamais l’audio ni le texte."), href: "/docs", cta: "Lire la documentation" },
  ],
  faqH: "Questions",
  faq: [
    ["Quelles langues l’API couvre-t-elle ?", fr("Le hausa aujourd’hui, avec le français pour la traduction. Le Lab travaille sur les langues du Sahel une à une ; son programme zarma démarre, et une langue arrive dans l’API une fois ses modèles mesurés et publiés.")],
    ["Est-ce gratuit ?", fr("Oui, pendant la bêta. Chaque compte reçoit 30 minutes d’audio par mois, remises à zéro le premier de chaque mois (UTC). Les tarifs seront publiés avec chaque modèle.")],
    ["Qu’est-ce qui compte dans le quota ?", fr("Les minutes d’audio : l’audio que vous envoyez et, pour la synthèse vocale, la parole que vous recevez. Chaque réponse indique ce qu’elle a compté, et la console fait le total.")],
    ["Quelles sont les limites de débit ?", fr(`${LIMITS.keyPerMin} requêtes par minute et par clé. Au-delà, l’API répond 429 avec un en-tête Retry-After qui indique combien de temps attendre.`)],
    ["Que gardez-vous de mes requêtes ?", fr("Des relevés de consommation : quel modèle, quand, combien d’audio, en combien de temps et avec quel statut. Les journaux de la console ne contiennent jamais l’audio ni le texte.")],
    ["Est-ce prêt pour la production ?", fr("C’est une bêta : les points d’accès peuvent changer, et chaque modèle est en développement ou en recherche. Construisez des prototypes et des pilotes dès maintenant, et parlez-nous avant de les mettre devant beaucoup de monde.")],
    ["Existe-t-il des SDK ?", fr("Pas encore. L’API est du HTTPS simple avec du JSON, et la documentation montre chaque appel en cURL, Python et JavaScript.")],
    ["Y a-t-il du streaming ?", fr("Pas encore : chaque requête renvoie un résultat complet. Le streaming pour les agents en direct est prévu.")],
  ].map(([q, a]) => [fr(q), a] as [string, string]),
  endH: "Votre première requête est gratuite",
  endSub: "Inscrivez-vous, créez une clé, et entendez du hausa depuis votre propre code.",
};

export const apiCopy: Record<Lang, ApiCopy> = { en, fr: frCopy };

/* Aïr's welcome, as the home page's live call plays it (public/converse/README.md). HA-REVIEW. */
export const AIR_HELLO = {
  src: "/converse/nadia/hello.m4a",
  text: "Sannu da zuwa! Ni ce Nadia, daga Namu. Muna gina fasahar murya don harsunan Afirka. Ku yi mini magana da Hausa, zan saurare ku.",
  gloss: { en: "Welcome! I’m Nadia, from Namu. We build voice technology for African languages. Speak to me in Hausa; I’m listening.",
           fr: `Bienvenue${n}! Je suis Nadia, de Namu. Nous construisons des technologies vocales pour les langues africaines. Parlez-moi en hausa${n}; je vous écoute.` },
} as const;
