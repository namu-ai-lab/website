/* The API landing page (/api), rebuilt 2026-10-21 around one idea: a developer page should let you make a real
   request before it asks for anything. The hero runs the live models through the site's demo key; then the four
   models as a spec sheet, the three steps to a first request, the anatomy of a request (with a real response),
   the models chained into products, the console, the beta's limits, the Lab's commitments and an FAQ.
   Claims gate: the API is in beta, open to anyone who signs up, free within 30 minutes of audio a month; every model
   is "In development" or "In research"; no prices, customers, compliance badges or benchmark numbers. Every limit
   is the gateway's (src/lib/limits.ts, the docs). The only timing shown is the visitor's own request, labelled so.
   Positioning (founder, 2026-10-15): the languages of the Sahel, never Hausa alone; Hausa is where the models are today.
   HA-REVIEW: the Hausa sample sentences need a native speaker's check (the transcript in `anatomy` is Tatsuniya's
   real output, kept exactly as returned).
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication. */
import type { Lang } from "@/i18n/config";
import { LIMITS } from "@/lib/limits";

const n = " ";   // narrow no-break space before French high punctuation
const fr = (s: string) => s.replace(/ ([:;!?»])/g, `${n}$1`).replace(/« /g, `«${n}`);

export type ApiTask = "speech" | "transcribe" | "translate" | "converse";
export type ApiModel = { task: ApiTask; name: string; verb: string; job: string; endpoint: string; io: [string, string]; langs: string;
  limit: string; status: string; research?: boolean; href: string };
export type ApiFlow = { id: string; t: string; d: string; steps: { kind: "you" | ApiTask | "code"; label: string; note?: string }[]; code: string };

export type ApiCopy = {
  meta: [string, string];
  status: string; h1: string; lede: string; start: string; docs: string; facts: string[];
  run: {
    label: string; input: string; code: string; response: string; copy: string; copied: string;
    go: string; going: string; waking: string; again: string; idle: (model: string) => string; yours: string; note: string;
    voice: string; voices: { id: "nadia" | "salim"; name: string }[]; text: string; count: (n: number, max: number) => string;
    sample: string; listen: string; direction: string; dirs: { fr: string; ha: string }; play: string; stop: string; download: string;
    converse: string; converseCta: string; limited: string; unavailable: string; failed: string; tooLong: string;
  };
  modelsH: string; modelsSub: string; labels: { endpoint: string; io: string; langs: string; limit: string }; tryIt: string; page: string;
  models: ApiModel[];
  stepsH: string; stepsSub: string; steps: { t: string; d: string }[];
  mock: { google: string; github: string; email: string; save: string; saveNote: string; done: string; ok: string };
  anatomyH: string; anatomySub: string; anatomyReal: string; anatomyErr: string; notes: { t: string; d: string }[];
  composeH: string; composeSub: string; flows: ApiFlow[]; yourCode: string; session: string;
  consoleH: string; consoleSub: string; consoleTabs: { id: string; label: string; alt: string }[]; consoleNote: string; consolePoints: string[];
  freeH: string; freeSub: string; allowance: [string, string, string]; limits: [string, string][]; more: string; pricing: string;
  promiseH: string; promises: { t: string; d: string; href: string; cta: string }[];
  faqH: string; faq: [string, string][];
  endH: string; endSub: string;
};

const en: ApiCopy = {
  meta: ["API", "The Namu API, in beta: the Lab’s speech models for the languages of the Sahel, starting with Hausa. Transcribe, speak, translate and converse through one API, free during the beta."],
  status: "Beta",
  h1: "Build voice products for the Sahel",
  lede: "Transcribe, speak, translate and hold a conversation in Hausa, with French alongside, through one API. Run a real request below; your own key is free during the beta.",
  start: "Get an API key", docs: "Read the docs",
  facts: ["Free during the beta", "30 minutes of audio a month", "No card needed"],
  run: {
    label: "Try the API", input: "Input", code: "Request", response: "Response", copy: "Copy", copied: "Copied",
    go: "Run", going: "Running…", waking: "Waking the model. The first request after a quiet spell can take up to a minute.", again: "Run again",
    idle: m => `Press Run to call ${m}, live.`, yours: "this request",
    note: "A real request to the live model, through the site’s demo key and its smaller limits.",
    voice: "Voice", voices: [{ id: "nadia", name: "Nadia" }, { id: "salim", name: "Salim" }],
    text: "Text", count: (c, max) => `${c} / ${max}`,
    sample: "Sample", listen: "Hear the sample", direction: "Direction", dirs: { fr: "Hausa → French", ha: "French → Hausa" },
    play: "Play", stop: "Stop", download: "Download",
    converse: "Aïr holds a live, spoken conversation: one call per turn, with a session that remembers. Try a call on the home page.", converseCta: "Call Aïr",
    limited: "The demo’s hourly limit is reached. Your own key has its own, larger limits.", unavailable: "The live demo is not available right now.",
    failed: "That did not work. Try again in a moment.", tooLong: "Up to 300 characters in the demo.",
  },
  modelsH: "Four models, one key",
  modelsSub: "Each comes from the Lab’s research and answers on its own endpoint. One key calls them all, or only the ones you allow it.",
  labels: { endpoint: "Endpoint", io: "In → out", langs: "Languages", limit: "Per request" },
  tryIt: "Try it", page: "Model page",
  models: [
    { task: "speech", name: "Tafiya", verb: "Speak", job: "Text to speech", endpoint: "POST /v1/speech", io: ["Text", "Speech"], langs: "Hausa, and a French reference voice",
      limit: `Up to ${LIMITS.textChars.toLocaleString("en-US")} characters`, status: "In development", href: "https://www.namu-ai.org/models/tafiya" },
    { task: "transcribe", name: "Tatsuniya", verb: "Transcribe", job: "Speech to text", endpoint: "POST /v1/transcribe", io: ["Speech", "Text"], langs: "Hausa",
      limit: `Up to ${LIMITS.uploadMb} MB or ${LIMITS.audioMinutes} minutes of audio`, status: "In development", href: "https://www.namu-ai.org/models/tatsuniya" },
    { task: "translate", name: "Kora", verb: "Translate", job: "Speech translation", endpoint: "POST /v1/translate", io: ["Speech", "Text and speech"], langs: "Hausa ⇄ French",
      limit: `Up to ${LIMITS.uploadMb} MB or ${LIMITS.audioMinutes} minutes of audio`, status: "In development", href: "https://www.namu-ai.org/models/kora" },
    { task: "converse", name: "Aïr", verb: "Converse", job: "Spoken conversation", endpoint: "POST /v1/converse", io: ["Speech", "Speech"], langs: "Hausa",
      limit: "One spoken turn, with a session that remembers", status: "In research", research: true, href: "/models/air" },
  ],
  stepsH: "From sign-up to first sound",
  stepsSub: "Three steps and a few minutes. No card, no waiting list.",
  steps: [
    { t: "Create an account", d: "With your email, Google or GitHub. Your account can create keys straight away." },
    { t: "Create a key", d: "Name it, choose which models it may call, and copy it once. We keep only a fingerprint of it." },
    { t: "Make a request", d: "Export the key and send your first Hausa sentence. It shows up in your console’s logs." },
  ],
  mock: { google: "Continue with Google", github: "Continue with GitHub", email: "Email address", save: "Save your key", saveNote: "You won’t see it again.", done: "Done", ok: "200 OK · speech.wav" },
  anatomyH: "Anatomy of a request",
  anatomySub: "One endpoint per task, one key for all of them, and one shape for every error. This is a real request, and the response Tatsuniya returned.",
  anatomyReal: "Tatsuniya’s answer to the “storyteller” sample, 21 October 2026",
  anatomyErr: `# and when a key goes past ${LIMITS.keyPerMin} requests a minute:`,
  notes: [
    { t: "Your key", d: `A Bearer token on every request. Keys can be limited to some models and revoked at once; a revoked key stops working within ${LIMITS.revokeSeconds} seconds.` },
    { t: "Any common audio", d: `WAV, MP3, OGG, WebM or M4A, up to ${LIMITS.uploadMb} MB and ${LIMITS.audioMinutes} minutes. Send it as it is: no conversion needed.` },
    { t: "Written as Hausa is written", d: "Tatsuniya writes in Hausa’s own alphabet, hooked letters included (ɓ ɗ ƙ ƴ), as in ƙauye here. The Lab scores every result twice, strict and folded, so you can see what spelling costs." },
    { t: "What was counted", d: "Every response says how much audio it counted. Your monthly allowance is measured in exactly that." },
    { t: "One error shape", d: "Every error is {\"error\": {\"type\", \"message\"}}, with a status you can act on: 429 with Retry-After when you go too fast." },
  ],
  composeH: "Put the models together",
  composeSub: "Each model does one thing well. Chained in a few lines of your own code, they become a product.",
  yourCode: "Your code",
  session: "namu: a requests.Session with your key and the API’s base URL (see the docs).",
  flows: [
    { id: "line", t: "A phone information line", d: "A caller asks a question out loud; your service looks up the answer and reads it back in Hausa.",
      steps: [{ kind: "you", label: "Caller", note: "asks out loud" }, { kind: "transcribe", label: "Tatsuniya" }, { kind: "code", label: "Your code", note: "finds the answer" }, { kind: "speech", label: "Tafiya" }, { kind: "you", label: "Caller", note: "hears it" }],
      code: `question = namu.post("/v1/transcribe", files={"file": call_audio}).json()["text"]
answer = lookup_prices(question)            # your logic
speech = namu.post("/v1/speech", json={"text": answer, "voice": "nadia"})
play_to_caller(speech.content)` },
    { id: "desk", t: "A bilingual help desk", d: "A Hausa speaker and a French-speaking agent understand each other, each in their own language.",
      steps: [{ kind: "you", label: "Hausa speaker" }, { kind: "translate", label: "Kora", note: "to French" }, { kind: "you", label: "Agent", note: "reads, replies in French" }, { kind: "translate", label: "Kora", note: "to Hausa, spoken" }, { kind: "you", label: "Hausa speaker" }],
      code: `fr = namu.post("/v1/translate", files={"file": caller_audio}, data={"target": "fr"}).json()
show_agent(fr["text"])
ha = namu.post("/v1/translate", files={"file": agent_audio},
               data={"target": "ha", "include_audio": "true"}).json()
play_to_caller(b64decode(ha["audio"]))` },
    { id: "radio", t: "Searchable radio and meetings", d: "Recordings become text you can search, caption and quote.",
      steps: [{ kind: "you", label: "Recording" }, { kind: "transcribe", label: "Tatsuniya" }, { kind: "code", label: "Your code", note: "indexes, captions" }],
      code: `for clip in split_into_clips("morning_show.mp3", minutes=5):
    text = namu.post("/v1/transcribe", files={"file": clip}).json()["text"]
    index.add(clip.start, text)` },
    { id: "lessons", t: "Lessons read aloud", d: "Reading material becomes audio that learners can play as often as they need.",
      steps: [{ kind: "you", label: "Lesson text" }, { kind: "speech", label: "Tafiya" }, { kind: "you", label: "Learners", note: "listen offline" }],
      code: `for page in lesson.pages:
    audio = namu.post("/v1/speech", json={"text": page.text, "voice": "salim"})
    save(f"{lesson.id}-{page.n}.wav", audio.content)` },
    { id: "agent", t: "A voice assistant", d: "One call per spoken turn; reuse the session and Aïr remembers the conversation.",
      steps: [{ kind: "you", label: "User", note: "speaks" }, { kind: "converse", label: "Aïr", note: "hears, answers aloud" }, { kind: "you", label: "User", note: "hears the reply" }],
      code: `while True:
    turn = namu.post("/v1/converse", files={"file": record_turn()},
                     data={"persona": "nadia", "session_id": "user-42"}).json()
    play(b64decode(turn["audio"]))      # same session_id: Aïr remembers the turns` },
  ],
  consoleH: "A console for every key",
  consoleSub: "Keys, usage, logs and a playground for every model, organised like the developer consoles you already know.",
  consoleTabs: [
    { id: "home", label: "Home", alt: "The console’s Home: getting started, the month’s usage, recent requests and the models." },
    { id: "playground", label: "Playground", alt: "The console’s Playground, trying text to speech on your own account." },
    { id: "usage", label: "Usage", alt: "The console’s Usage page: requests per day by model, and a table by model." },
    { id: "logs", label: "Logs", alt: "The console’s Logs: every request with its model, key, status and latency." },
  ],
  consoleNote: "Sample data.",
  consolePoints: ["Keys you can name, limit to some models and revoke", "Usage by model or by key, with a CSV export", "Logs of every request: never the audio or the text", "A playground that runs on your own account"],
  freeH: "Free while we are in beta",
  freeSub: "Every account gets the same allowance. Build, test and pilot on it; write to us when you need more.",
  allowance: ["30", "minutes of audio a month", "Audio you send and speech you get back both count. Resets on the 1st (UTC)."],
  limits: [
    [`${LIMITS.keyPerMin}`, "requests a minute, per key"],
    [`${LIMITS.uploadMb} MB`, `or ${LIMITS.audioMinutes} minutes per audio file`],
    [LIMITS.textChars.toLocaleString("en-US"), "characters per speech request"],
    ["10", "active keys per account"],
  ],
  more: "Need more? Write to us", pricing: "Pricing will be published with each model’s release.",
  promiseH: "Behind every endpoint",
  promises: [
    { t: "Measured honestly", d: "Every release comes with a model card. Every score is reported strict and folded, on test sets frozen before training.", href: "/research/why-we-report-every-hausa-score-twice", cta: "How we score speech" },
    { t: "Built on consented data", d: "The Lab’s own recordings come from speakers who are told, in their language, how their voice will be used, choose its licence, are paid for their time, and can withdraw.", href: "/research/who-is-in-the-fleurs-hausa-test-set", cta: "Who is in the test set" },
  ],
  faqH: "Questions",
  faq: [
    ["Which languages does the API cover?", "Hausa today, with French for translation and a French reference voice. The Lab works on the languages of the Sahel one at a time; its Zarma programme is starting, and a language reaches the API once its models are measured and released."],
    ["Is it free?", "Yes, during the beta. Every account gets 30 minutes of audio a month, reset on the first of each month (UTC). Pricing will be published with each model’s release."],
    ["What counts towards the allowance?", "Audio minutes: the audio you send and the speech you get back. Every response tells you how much it counted, and the console adds it up."],
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
  status: "Bêta",
  h1: "Créez des produits vocaux pour le Sahel",
  lede: fr("Transcrire, parler, traduire et tenir une conversation en hausa, avec le français à côté, grâce à une seule API. Lancez une vraie requête ci-dessous ; votre propre clé est gratuite pendant la bêta."),
  start: "Obtenir une clé d’API", docs: "Lire la documentation",
  facts: ["Gratuit pendant la bêta", "30 minutes d’audio par mois", "Sans carte bancaire"],
  run: {
    label: "Essayer l’API", input: "Entrée", code: "Requête", response: "Réponse", copy: "Copier", copied: "Copié",
    go: "Lancer", going: "En cours…", waking: "Réveil du modèle. Après un moment d’inactivité, la première requête peut prendre jusqu’à une minute.", again: "Relancer",
    idle: m => `Appuyez sur Lancer pour appeler ${m}, en direct.`, yours: "cette requête",
    note: "Une vraie requête au modèle en direct, avec la clé de démonstration du site et ses limites réduites.",
    voice: "Voix", voices: [{ id: "nadia", name: "Nadia" }, { id: "salim", name: "Salim" }],
    text: "Texte", count: (c, max) => `${c} / ${max}`,
    sample: "Extrait", listen: "Écouter l’extrait", direction: "Sens", dirs: { fr: "Hausa → français", ha: "Français → hausa" },
    play: "Écouter", stop: "Arrêter", download: "Télécharger",
    converse: fr("Aïr tient une conversation parlée en direct : un appel par tour de parole, avec une session qui se souvient. Essayez un appel sur la page d’accueil."), converseCta: "Appeler Aïr",
    limited: "La limite horaire de la démonstration est atteinte. Votre propre clé a ses propres limites, plus larges.", unavailable: "La démonstration en direct n’est pas disponible pour le moment.",
    failed: fr("Cela n’a pas fonctionné. Réessayez dans un instant."), tooLong: "300 caractères au maximum dans la démonstration.",
  },
  modelsH: "Quatre modèles, une clé",
  modelsSub: "Chacun est issu des recherches du Lab et répond sur son propre point d’accès. Une clé les appelle tous, ou seulement ceux que vous autorisez.",
  labels: { endpoint: "Point d’accès", io: "Entrée → sortie", langs: "Langues", limit: "Par requête" },
  tryIt: "Essayer", page: "Page du modèle",
  models: [
    { task: "speech", name: "Tafiya", verb: "Parler", job: "Texte vers parole", endpoint: "POST /v1/speech", io: ["Texte", "Parole"], langs: "Hausa, et une voix de référence en français",
      limit: `Jusqu’à 2${n}000 caractères`, status: "En développement", href: "https://www.namu-ai.org/models/tafiya" },
    { task: "transcribe", name: "Tatsuniya", verb: "Transcrire", job: "Parole vers texte", endpoint: "POST /v1/transcribe", io: ["Parole", "Texte"], langs: "Hausa",
      limit: `Jusqu’à ${LIMITS.uploadMb} Mo ou ${LIMITS.audioMinutes} minutes d’audio`, status: "En développement", href: "https://www.namu-ai.org/models/tatsuniya" },
    { task: "translate", name: "Kora", verb: "Traduire", job: "Traduction de la parole", endpoint: "POST /v1/translate", io: ["Parole", "Texte et parole"], langs: "Hausa ⇄ français",
      limit: `Jusqu’à ${LIMITS.uploadMb} Mo ou ${LIMITS.audioMinutes} minutes d’audio`, status: "En développement", href: "https://www.namu-ai.org/models/kora" },
    { task: "converse", name: "Aïr", verb: "Converser", job: "Conversation parlée", endpoint: "POST /v1/converse", io: ["Parole", "Parole"], langs: "Hausa",
      limit: "Un tour de parole, avec une session qui se souvient", status: "En recherche", research: true, href: "/models/air" },
  ],
  stepsH: "De l’inscription au premier son",
  stepsSub: "Trois étapes et quelques minutes. Sans carte, sans liste d’attente.",
  steps: [
    { t: "Créer un compte", d: "Avec votre e-mail, Google ou GitHub. Votre compte peut créer des clés aussitôt." },
    { t: "Créer une clé", d: fr("Nommez-la, choisissez les modèles qu’elle peut appeler et copiez-la une fois : nous n’en gardons qu’une empreinte.") },
    { t: "Faire une requête", d: "Exportez la clé et envoyez votre première phrase en hausa. Elle apparaît dans les journaux de votre console." },
  ],
  mock: { google: "Continuer avec Google", github: "Continuer avec GitHub", email: "Adresse e-mail", save: "Enregistrez votre clé", saveNote: "Vous ne la reverrez plus.", done: "Terminé", ok: "200 OK · speech.wav" },
  anatomyH: "Anatomie d’une requête",
  anatomySub: "Un point d’accès par tâche, une clé pour tous, et une seule forme pour chaque erreur. Voici une vraie requête, et la réponse renvoyée par Tatsuniya.",
  anatomyReal: "La réponse de Tatsuniya à l’extrait « conteur », 21 octobre 2026",
  anatomyErr: `# et quand une clé dépasse ${LIMITS.keyPerMin} requêtes par minute :`,
  notes: [
    { t: "Votre clé", d: fr(`Un jeton Bearer à chaque requête. Une clé peut être limitée à certains modèles et révoquée aussitôt ; une clé révoquée cesse de fonctionner en ${LIMITS.revokeSeconds} secondes.`) },
    { t: "Tout audio courant", d: fr(`WAV, MP3, OGG, WebM ou M4A, jusqu’à ${LIMITS.uploadMb} Mo et ${LIMITS.audioMinutes} minutes. Envoyez-le tel quel : aucune conversion nécessaire.`) },
    { t: "Écrit comme s’écrit le hausa", d: fr("Tatsuniya écrit dans l’alphabet du hausa, lettres crochetées comprises (ɓ ɗ ƙ ƴ), comme dans ƙauye ici. Le Lab note chaque résultat deux fois, en strict et en replié, pour montrer ce que coûte l’orthographe.") },
    { t: "Ce qui a été compté", d: fr("Chaque réponse indique la durée d’audio comptée. Votre quota mensuel se mesure exactement ainsi.") },
    { t: "Une seule forme d’erreur", d: fr("Chaque erreur est {\"error\": {\"type\", \"message\"}}, avec un statut exploitable : 429 et Retry-After si vous allez trop vite.") },
  ],
  composeH: "Assemblez les modèles",
  composeSub: "Chaque modèle fait une chose, et la fait bien. Enchaînés en quelques lignes de votre code, ils deviennent un produit.",
  yourCode: "Votre code",
  session: "namu : une requests.Session avec votre clé et l’URL de base de l’API (voir la documentation).",
  flows: [
    { id: "line", t: "Une ligne d’information téléphonique", d: "Une personne pose sa question à voix haute ; votre service trouve la réponse et la lit en hausa.",
      steps: [{ kind: "you", label: "Appelant", note: "pose sa question" }, { kind: "transcribe", label: "Tatsuniya" }, { kind: "code", label: "Votre code", note: "trouve la réponse" }, { kind: "speech", label: "Tafiya" }, { kind: "you", label: "Appelant", note: "l’entend" }],
      code: en.flows[0].code },
    { id: "desk", t: "Un service d’aide bilingue", d: "Une personne qui parle hausa et un agent francophone se comprennent, chacun dans sa langue.",
      steps: [{ kind: "you", label: "Locuteur hausa" }, { kind: "translate", label: "Kora", note: "vers le français" }, { kind: "you", label: "Agent", note: "lit, répond en français" }, { kind: "translate", label: "Kora", note: "vers le hausa, à voix haute" }, { kind: "you", label: "Locuteur hausa" }],
      code: en.flows[1].code },
    { id: "radio", t: "Radio et réunions consultables", d: "Les enregistrements deviennent du texte que l’on peut rechercher, sous-titrer et citer.",
      steps: [{ kind: "you", label: "Enregistrement" }, { kind: "transcribe", label: "Tatsuniya" }, { kind: "code", label: "Votre code", note: "indexe, sous-titre" }],
      code: en.flows[2].code },
    { id: "lessons", t: "Des leçons lues à voix haute", d: "Les supports de lecture deviennent de l’audio que les élèves écoutent autant qu’il le faut.",
      steps: [{ kind: "you", label: "Texte de la leçon" }, { kind: "speech", label: "Tafiya" }, { kind: "you", label: "Élèves", note: "écoutent hors ligne" }],
      code: en.flows[3].code },
    { id: "agent", t: "Un assistant vocal", d: fr("Un appel par tour de parole ; réutilisez la session et Aïr se souvient de la conversation."),
      steps: [{ kind: "you", label: "Utilisateur", note: "parle" }, { kind: "converse", label: "Aïr", note: "entend, répond à voix haute" }, { kind: "you", label: "Utilisateur", note: "entend la réponse" }],
      code: en.flows[4].code },
  ],
  consoleH: "Une console pour chaque clé",
  consoleSub: "Clés, consommation, journaux et un bac à sable pour chaque modèle, organisés comme les consoles de développeur que vous connaissez.",
  consoleTabs: [
    { id: "home", label: "Accueil", alt: fr("L’accueil de la console : prise en main, consommation du mois, dernières requêtes et modèles.") },
    { id: "playground", label: "Bac à sable", alt: "Le bac à sable de la console, avec la synthèse vocale sur votre propre compte." },
    { id: "usage", label: "Consommation", alt: fr("La page Consommation : requêtes par jour et par modèle, et un tableau par modèle.") },
    { id: "logs", label: "Journaux", alt: fr("Les journaux : chaque requête avec son modèle, sa clé, son statut et sa latence.") },
  ],
  consoleNote: "Données d’exemple.",
  consolePoints: ["Des clés que l’on nomme, limite à certains modèles et révoque", "La consommation par modèle ou par clé, avec un export CSV", fr("Le journal de chaque requête : jamais l’audio ni le texte"), "Un bac à sable qui fonctionne sur votre propre compte"],
  freeH: "Gratuit pendant la bêta",
  freeSub: "Chaque compte reçoit le même quota. Construisez, testez et menez des pilotes avec ; écrivez-nous quand il vous en faut plus.",
  allowance: ["30", "minutes d’audio par mois", "L’audio envoyé et la parole reçue comptent tous deux. Remis à zéro le 1er (UTC)."],
  limits: [
    [`${LIMITS.keyPerMin}`, "requêtes par minute, par clé"],
    [`${LIMITS.uploadMb} Mo`, `ou ${LIMITS.audioMinutes} minutes par fichier audio`],
    [`2${n}000`, "caractères par requête de synthèse"],
    ["10", "clés actives par compte"],
  ],
  more: "Besoin de plus ? Écrivez-nous".replace(" ?", `${n}?`), pricing: "Les tarifs seront publiés avec chaque modèle.",
  promiseH: "Derrière chaque point d’accès",
  promises: [
    { t: "Mesuré honnêtement", d: "Chaque version est publiée avec sa fiche de modèle. Chaque score est donné en strict et en replié, sur des jeux de test figés avant l’entraînement.", href: "/research/why-we-report-every-hausa-score-twice", cta: "Comment nous évaluons la parole" },
    { t: "Construit sur des données consenties", d: "Les enregistrements du Lab viennent de locuteurs qui savent, dans leur langue, comment leur voix sera utilisée, choisissent sa licence, sont rémunérés pour leur temps et peuvent se retirer.", href: "/research/who-is-in-the-fleurs-hausa-test-set", cta: "Qui figure dans le jeu de test" },
  ],
  faqH: "Questions",
  faq: [
    ["Quelles langues l’API couvre-t-elle ?", fr("Le hausa aujourd’hui, avec le français pour la traduction et une voix de référence en français. Le Lab travaille sur les langues du Sahel une à une ; son programme zarma démarre, et une langue arrive dans l’API une fois ses modèles mesurés et publiés.")],
    ["Est-ce gratuit ?", fr("Oui, pendant la bêta. Chaque compte reçoit 30 minutes d’audio par mois, remises à zéro le premier de chaque mois (UTC). Les tarifs seront publiés avec chaque modèle.")],
    ["Qu’est-ce qui compte dans le quota ?", fr("Les minutes d’audio : l’audio que vous envoyez et la parole que vous recevez. Chaque réponse indique ce qu’elle a compté, et la console fait le total.")],
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

/* The live demo's inputs. HA-REVIEW: written for the demo; the samples are the home playground's clips. */
export const API_DEMO = {
  text: "Barka da safiya! Ga labaran yau daga Yamai da Kano.",
  maxText: 300,
  samples: {
    transcribe: [
      { id: "story", src: "/usecases/heritage.m4a", label: { en: "A storyteller", fr: "Un conteur" } },
      { id: "market", src: "/usecases/translation-ha.m4a", label: { en: "At the market", fr: "Au marché" } },
      { id: "count", src: "/usecases/education.m4a", label: { en: "Counting", fr: "Compter" } },
    ],
    translate: {
      fr: [{ id: "market", src: "/usecases/translation-ha.m4a", label: { en: "At the market", fr: "Au marché" } }, { id: "story", src: "/usecases/heritage.m4a", label: { en: "A storyteller", fr: "Un conteur" } }],
      ha: [{ id: "form", src: "/usecases/translation-fr-form.m4a", label: { en: "Filling in a form", fr: "Remplir un formulaire" } }, { id: "story-fr", src: "/usecases/translation-fr-story.m4a", label: { en: "A storyteller", fr: "Un conteur" } }],
    },
  },
  /* Tatsuniya's real response to /usecases/heritage.m4a through the gateway on 2026-10-21, unedited */
  real: { model: "tatsuniya", text: "wata rana a wani ƙauye akwai wani tsoho mai bada labari.", language: "ha", audio_seconds: 3.4 },
} as const;
