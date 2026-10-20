/* The API landing page (/api). The hero is the request/response studio (the founder's pick); the rest follows
   openai.com/api's sequence, adapted to Namu: models as tall image cards, guides, the platform in three
   pictures, an interactive list of use cases, three columns of commitments, and two ways to get started.
   Claims gate: the API is in private beta (accounts approved by hand); every model is "In development" or
   "In research"; no prices, no
   customers, no compliance badges, no performance numbers. Endpoints are provisional and the page says so.
   Platform features are labelled as planned. Use cases are what could be built, not deployments.
   Positioning (founder, 2026-10-15): the languages of the Sahel, never Hausa alone.
   HA-REVIEW: the sample sentences (studio, mock-ups) need a native speaker's check.
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication. */
import type { Lang } from "@/i18n/config";

const n = " ";   // narrow no-break space before French high punctuation
const fr = (s: string) => s.replace(/ ([:;!?»])/g, `${n}$1`).replace(/« /g, `«${n}`);

export type ApiModel = { slug: string; name: string; verb: string; task: string; endpoint: string; io: [string, string]; status: string; research?: boolean; href: string };
type Use = { icon: string; t: string; d: string; label: string; gloss: string };

export type ApiCopy = {
  meta: [string, string];
  status: string; h1: string; lede: string; start: string; talk: string;
  studio: { request: string; response: string; replay: string; note: string; streaming: string; done: string };
  modelsH: string; modelsSub: string; labels: { task: string; io: string; endpoint: string; status: string }; learnMore: string; provisional: string;
  models: ApiModel[];
  guidesH: string; guides: { t: string; d: string; href: string; cta: string }[];
  platformH: string; platformSub: string; readResearch: string;
  pillars: { t: string; d: string }[];
  mock: { transcript: string; strict: string; folded: string; voice: string; voiceNote: string; live: string; you: string };
  useH: string; useSub: string; talkUse: string; uses: Use[];
  builtH: string; builtSub: string; planned: string; columns: { t: string; planned?: boolean; items: string[] }[];
  startH: string; partner: { t: string; d: string; items: string[]; cta: string }; build: { t: string; d: string; items: string[]; cta: string };
};

const en: ApiCopy = {
  meta: ["API", "The Namu API, in private beta, brings the Lab’s speech models for the languages of the Sahel to developers and organisations: speech recognition, speech synthesis, speech translation and live conversation."],
  status: "Private beta",
  h1: "Build voice products for the Sahel",
  lede: "One API for the Lab’s speech models. Hear, speak, translate and hold a conversation in the languages of the Sahel.",
  start: "Start building", talk: "Talk to us",
  studio: { request: "Request", response: "Response", replay: "Replay", note: "Illustrative response. Call the live models with your own key.", streaming: "Streaming", done: "Done" },
  modelsH: "Powered by the Lab’s speech models",
  modelsSub: "Four models from the research on this site, each to be released with a model card.",
  labels: { task: "Task", io: "In → out", endpoint: "Endpoint", status: "Status" },
  learnMore: "Learn more",
  provisional: "Endpoints are provisional during the private beta. Pricing and data terms will be published with each model’s release; current limits are in the docs.",
  models: [
    { slug: "tatsuniya", name: "Tatsuniya", verb: "Listen", task: "Speech recognition", endpoint: "/v1/transcribe", io: ["Speech", "Text"], status: "In development", href: "https://www.namu-ai.org/models/tatsuniya" },
    { slug: "tafiya", name: "Tafiya", verb: "Speak", task: "Speech synthesis", endpoint: "/v1/speech", io: ["Text", "Speech"], status: "In development", href: "https://www.namu-ai.org/models/tafiya" },
    { slug: "kora", name: "Kora", verb: "Translate", task: "Speech translation", endpoint: "/v1/translate", io: ["Speech", "French"], status: "In development", href: "https://www.namu-ai.org/models/kora" },
    { slug: "air", name: "Aïr", verb: "Converse", task: "Live conversation", endpoint: "/v1/converse", io: ["Voice", "Voice"], status: "In research", research: true, href: "/models/air" },
  ],
  guidesH: "Start building with the Lab’s models",
  guides: [
    { t: "How we score speech", d: "Every result is reported twice, strict and folded for spelling variants. Learn to read both.", href: "/research/why-we-report-every-hausa-score-twice", cta: "Read the method" },
    { t: "Know your test set", d: "Who is, and is not, in the public test set that most results are measured on.", href: "/research/who-is-in-the-fleurs-hausa-test-set", cta: "Read the analysis" },
    { t: "Hear a conversation", d: "Listen to Aïr, the Lab’s research system for holding a spoken conversation.", href: "/models/air", cta: "Hear Aïr" },
  ],
  platformH: "One platform for voice in the Sahel",
  platformSub: "Listen, speak and converse through one API, with the same measurement behind every model.",
  readResearch: "Read the research",
  pillars: [
    { t: "Listen", d: "Turn speech into text you can search, caption and act on, from phone calls, radio and field recordings." },
    { t: "Speak", d: "Turn writing into natural speech in a choice of consented voices, for apps, phone lines and devices." },
    { t: "Converse", d: "Hold a live spoken conversation that can wait, stop and acknowledge, or chain the models yourself." },
  ],
  mock: { transcript: "Transcript", strict: "Strict", folded: "Folded", voice: "Warm", voiceNote: "Even and close, for reading", live: "Live", you: "You" },
  useH: "What you can build",
  useSub: "For teams that need to reach people in the language they speak.",
  talkUse: "Talk to us",
  uses: [
    { icon: "phone-voice", t: "Customer service", d: "Voice agents that answer customers in their own language, at any hour, on the phone lines they already use.", label: "Incoming call", gloss: "I would like to buy millet at the market tomorrow morning." },
    { icon: "transcript", t: "Captions and transcripts", d: "Turn local radio, video and meetings into text people can search and read.", label: "Morning news", gloss: "Good morning! Here is today’s news from Niamey and Kano." },
    { icon: "paper", t: "Education", d: "Lessons, reading support and stories that students can listen and speak to.", label: "Story time", gloss: "Once upon a time!" },
    { icon: "headphones", t: "Information lines", d: "Health, farming and market information that people can ask for out loud.", label: "Market prices line", gloss: "The price of millet at Maradi market fell a little this week." },
    { icon: "translate", t: "Translation", d: "Carry speech and text between the languages of the Sahel and French, both ways.", label: "Kora", gloss: "" },
    { icon: "microphone", t: "Accessibility", d: "Products for people who would rather speak than read and type.", label: "Tap and speak", gloss: "" },
  ],
  builtH: "Built for the Sahel, the way the Lab works",
  builtSub: "What the platform is being designed to handle, and the commitments behind every model it will serve.",
  planned: "Planned",
  columns: [
    { t: "Made for how the Sahel speaks", planned: true, items: ["Phone-line audio as well as studio recordings", "Streaming for live agents, batch for archives and radio", "Text in the spelling each country uses", "Speech that moves between a local language and French", "Small requests for slow or costly connections"] },
    { t: "Measured honestly", items: ["A model card with every release", "Every score reported strict and folded", "Test sets frozen before training", "Test sets split by dialect and by gender", "Results published with their conditions"] },
    { t: "Built on consented data", items: ["Speakers told, in their language, how their voice will be used", "Speakers choose the licence for their recordings", "Speakers paid for their time", "Voices used only as their speakers allow", "A way to withdraw from every release"] },
  ],
  startH: "Get started",
  partner: { t: "Partner with us", d: "For organisations that want to shape the platform.", items: ["Evaluate the models in your own setting", "Contribute speech through the Rumbu programme", "Help decide what we release first"], cta: "Talk to us" },
  build: { t: "Build on your own", d: "For developers who want to start now, in the private beta.", items: ["Your own API keys once your account is approved", "Docs with code in cURL, Python and JavaScript", "A model card and evaluation for every release"], cta: "Get an API key" },
};

const frCopy: ApiCopy = {
  meta: ["API", fr("L’API de Namu, en bêta privée, met les modèles de parole du Lab pour les langues du Sahel à la disposition des développeurs et des organisations : reconnaissance vocale, synthèse vocale, traduction de la parole et conversation en direct.")],
  status: "Bêta privée",
  h1: "Créez des produits vocaux pour le Sahel",
  lede: "Une seule API pour les modèles de parole du Lab. Entendre, parler, traduire et tenir une conversation dans les langues du Sahel.",
  start: "Commencer à construire", talk: "Nous contacter",
  studio: { request: "Requête", response: "Réponse", replay: "Rejouer", note: "Réponse illustrative. Appelez les modèles en direct avec votre propre clé.", streaming: "En flux", done: "Terminé" },
  modelsH: "Propulsée par les modèles de parole du Lab",
  modelsSub: "Quatre modèles issus des recherches présentées sur ce site, chacun publié avec sa fiche de modèle.",
  labels: { task: "Tâche", io: "Entrée → sortie", endpoint: "Point d’accès", status: "Statut" },
  learnMore: "En savoir plus",
  provisional: fr("Les points d’accès sont provisoires pendant la bêta privée. Les tarifs et les conditions relatives aux données seront publiés avec chaque modèle ; les limites actuelles figurent dans la documentation."),
  models: [
    { slug: "tatsuniya", name: "Tatsuniya", verb: "Écouter", task: "Reconnaissance vocale", endpoint: "/v1/transcribe", io: ["Parole", "Texte"], status: "En développement", href: "https://www.namu-ai.org/models/tatsuniya" },
    { slug: "tafiya", name: "Tafiya", verb: "Parler", task: "Synthèse vocale", endpoint: "/v1/speech", io: ["Texte", "Parole"], status: "En développement", href: "https://www.namu-ai.org/models/tafiya" },
    { slug: "kora", name: "Kora", verb: "Traduire", task: "Traduction de la parole", endpoint: "/v1/translate", io: ["Parole", "Français"], status: "En développement", href: "https://www.namu-ai.org/models/kora" },
    { slug: "air", name: "Aïr", verb: "Converser", task: "Conversation en direct", endpoint: "/v1/converse", io: ["Voix", "Voix"], status: "En recherche", research: true, href: "/models/air" },
  ],
  guidesH: "Commencez à construire avec les modèles du Lab",
  guides: [
    { t: "Comment nous évaluons la parole", d: "Chaque résultat est donné deux fois, en strict et en replié pour les variantes d’orthographe. Apprenez à lire les deux.", href: "/research/why-we-report-every-hausa-score-twice", cta: "Lire la méthode" },
    { t: "Connaître son jeu de test", d: "Qui figure, et qui ne figure pas, dans le jeu de test public sur lequel la plupart des résultats sont mesurés.", href: "/research/who-is-in-the-fleurs-hausa-test-set", cta: "Lire l’analyse" },
    { t: "Écouter une conversation", d: "Écoutez Aïr, le système de recherche du Lab pour tenir une conversation parlée.", href: "/models/air", cta: "Écouter Aïr" },
  ],
  platformH: "Une plateforme pour la voix au Sahel",
  platformSub: "Écouter, parler et converser avec une seule API, avec la même mesure derrière chaque modèle.",
  readResearch: "Lire la recherche",
  pillars: [
    { t: "Écouter", d: "Transformer la parole en texte que l’on peut rechercher, sous-titrer et exploiter, depuis des appels, la radio ou des enregistrements de terrain." },
    { t: "Parler", d: "Transformer l’écrit en parole naturelle, avec un choix de voix consenties, pour les applications, les lignes téléphoniques et les appareils." },
    { t: "Converser", d: "Tenir une conversation parlée en direct, qui sait attendre, s’arrêter et acquiescer, ou enchaîner vous-même les modèles." },
  ],
  mock: { transcript: "Transcription", strict: "Strict", folded: "Replié", voice: "Chaleureuse", voiceNote: "Égale et proche, pour la lecture", live: "En direct", you: "Vous" },
  useH: "Ce que vous pouvez construire",
  useSub: "Pour les équipes qui doivent toucher les gens dans la langue qu’ils parlent.",
  talkUse: "Nous contacter",
  uses: [
    { icon: "phone-voice", t: "Service client", d: "Des agents vocaux qui répondent aux clients dans leur propre langue, à toute heure, sur les lignes qu’ils utilisent déjà.", label: "Appel entrant", gloss: "Je voudrais acheter du mil au marché demain matin." },
    { icon: "transcript", t: "Sous-titres et transcriptions", d: "Transformer la radio locale, la vidéo et les réunions en texte que l’on peut rechercher et lire.", label: "Journal du matin", gloss: fr("Bonjour ! Voici les nouvelles du jour depuis Niamey et Kano.") },
    { icon: "paper", t: "Éducation", d: "Des leçons, une aide à la lecture et des histoires que les élèves peuvent écouter et auxquelles ils peuvent parler.", label: "L’heure du conte", gloss: fr("Il était une fois !") },
    { icon: "headphones", t: "Lignes d’information", d: "Des informations sur la santé, l’agriculture et les marchés que l’on peut demander à voix haute.", label: "Ligne des prix du marché", gloss: "Le prix du mil au marché de Maradi a un peu baissé cette semaine." },
    { icon: "translate", t: "Traduction", d: "Faire passer la parole et l’écrit entre les langues du Sahel et le français, dans les deux sens.", label: "Kora", gloss: "" },
    { icon: "microphone", t: "Accessibilité", d: "Des produits pour celles et ceux qui préfèrent parler plutôt que lire et écrire.", label: "Touchez et parlez", gloss: "" },
  ],
  builtH: "Pensée pour le Sahel, selon les principes du Lab",
  builtSub: "Ce que la plateforme est conçue pour prendre en charge, et les engagements derrière chaque modèle qu’elle servira.",
  planned: "Prévu",
  columns: [
    { t: "Pensée pour la façon dont on parle au Sahel", planned: true, items: ["L’audio des lignes téléphoniques autant que les enregistrements de studio", "En flux pour les agents en direct, par lots pour les archives et la radio", "Un texte dans l’orthographe de chaque pays", "Une parole qui passe d’une langue locale au français", "De petites requêtes pour des connexions lentes ou coûteuses"] },
    { t: "Une mesure honnête", items: ["Une fiche de modèle à chaque publication", "Chaque score donné en strict et en replié", "Des jeux de test figés avant l’entraînement", "Des jeux de test répartis par dialecte et par genre", "Des résultats publiés avec leurs conditions"] },
    { t: "Des données consenties", items: ["Les locuteurs savent, dans leur langue, comment leur voix sera utilisée", "Les locuteurs choisissent la licence de leurs enregistrements", "Les locuteurs sont rémunérés pour leur temps", "Des voix utilisées seulement comme leurs locuteurs l’autorisent", "Un moyen de se retirer de chaque publication"] },
  ],
  startH: "Commencer",
  partner: { t: "Devenez partenaire", d: "Pour les organisations qui veulent façonner la plateforme.", items: ["Évaluez les modèles dans votre propre contexte", "Contribuez des enregistrements via le programme Rumbu", "Aidez-nous à décider ce que nous publions en premier"], cta: "Nous contacter" },
  build: { t: "Construisez par vous-même", d: "Pour les développeurs qui veulent commencer dès maintenant, en bêta privée.", items: ["Vos propres clés d’API une fois votre compte validé", "Une documentation avec du code en cURL, Python et JavaScript", "Une fiche de modèle et une évaluation pour chaque publication"], cta: "Obtenir une clé d’API" },
};

export const apiCopy: Record<Lang, ApiCopy> = { en, fr: frCopy };
