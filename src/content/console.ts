/* Copy for the developer console (the signed-in pages), after platform.openai.com: its chrome, the overview, the
   keys table and the usage page. The older strings it still uses live in content/account.ts.
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication.
   Claims gate (as content/api.ts): no prices, no performance numbers; limits are the gateway's real ones. */
import type { Lang } from "@/i18n/config";

const n = " ";   // narrow no-break space before French high punctuation

export type ConsoleCopy = {
  api: string; menu: string; openMenu: string; closeMenu: string; signedIn: string;
  nav: { manage: string; monitor: string; overview: string; keys: string; usage: string; logs: string; limits: string; settings: string; build: string; playground: string; docs: string; reference: string; admin: string };
  access: { approved: string; pending: string; denied: string };
  overview: {
    meta: [string, string]; h1: (name: string) => string; lede: string;
    audio: string; minutes: (used: string, limit: string) => string; requests: string; keys: string; keysOf: (n: number, max: number) => string;
    firstH: string; firstLede: string; step1: string; step2: string; step3: string; createKey: string; envNote: string;
    modelsH: string; modelsLede: string; endpoint: string; read: string; copy: string; copied: string;
    welcome: (name: string) => string; startLede: string; keyName: string; keyNamePh: string; creating: string; created: string; shownOnce: string;
    tryFirst: string; playground: string; newKey: string; requests30: string; success: string; latency: string; last30: string;
    recentH: string; recentAll: string; recentEmpty: string; tryH: string; tryLede: string; tryIt: string; playgroundKey: string;
    getStarted: string; dismiss: string; steps: [string, string][]; quick: [string, string]; pg: [string, string];
    period: string; ranges: Record<"24h" | "7d" | "14d" | "30d", string>;
    m: { requests: string; audio: string; success: string; latency: string; chars: string; allowance: string };
    left: (min: string) => string; ofMonth: (limit: string, date: string) => string; more: string;
  };
  keys: {
    lede: string; createNew: string; count: (n: number, max: number) => string; base: string; copyBase: string;
    th: { name: string; secret: string; perms: string; created: string; lastUsed: string; actions: string };
    all: string; restricted: string; never: string; demo: string; revokeLabel: (name: string) => string;
    revokedH: (n: number) => string;
    emptyH: string; emptyBody: string;
    createH: string; nameLabel: string; namePh: string; permsLabel: string; permsAll: string; permsRestricted: string; permsHelp: string;
    cancel: string; create: string; creating: string;
    saveH: string; saveBody: string; copy: string; copied: string; copyFailed: string; done: string; permsOf: string;
    leaveQ: string; leaveBack: string; leaveYes: string;
    revokeH: string; revokeBody: string; revokeIt: string; revoking: string;
    editLabel: (name: string) => string; editH: string; save: string; saving: string; editNote: string; envHint: string;
    models: Record<string, { name: string; task: string }>;
    error: string;
  };
  playground: {
    meta: [string, string]; lede: string;
    modes: Record<"speech" | "transcribe" | "translate" | "converse", string>;
    settings: string; model: string; voice: string; voices: Record<"nadia", [string, string]>;
    textLabel: string; textPh: string; generate: string; generating: string;
    input: string; record: string; stopRec: string; upload: string; sample: string; samples: { ha: string; fr: string };
    recording: (t: string) => string; remove: string; maxRec: (m: number, mb: number) => string;
    transcribe: string; transcribing: string; translate: string; translating: string; send: string; sending: string;
    language: string; hausa: string; direction: string; haFr: string; frHa: string;
    persona: string; session: string; newSession: string; sessionNote: string;
    output: string; transcript: string; heard: string; translation: string; you: string; air: string;
    empty: Record<"speech" | "transcribe" | "translate" | "converse", string>;
    stats: { status: string; latency: string; audio: string; chars: string };
    download: string; copy: string; copied: string; copyFailed: string; play: string; pause: string;
    code: string; codeH: string; codeLede: string; close: string; wake: string; runsOn: string; history: string; noHistory: string;
    errors: { mic: string; decode: string; long: (m: number) => string; big: (mb: number) => string; generic: string };
  };
  logs: {
    meta: [string, string]; lede: string; privacy: string;
    range: { "24h": string; "7d": string; "30d": string }; allModels: string; allKeys: string; playground: string;
    status: { all: string; ok: string; errors: string };
    th: { time: string; model: string; key: string; status: string; audio: string; chars: string; latency: string };
    older: string; newest: string; emptyH: string; emptyBody: string; emptyCta: string; deletedKey: string;
  };
  settings: {
    meta: [string, string]; lede: string;
    profileH: string; name: string; save: string; saving: string; saved: string; email: string; verified: string; unverified: string;
    accountH: string; id: string; since: string; plan: string; planValue: (min: string) => string; copy: string; copied: string; copyFailed: string;
    securityH: string; methods: string; method: Record<string, string>;
    passwordH: string; current: string; next: string; change: string; changing: string; changed: string; rule: string;
    sessionsH: string; sessionsBody: string; signOutAll: string; signingOut: string;
    deleteH: string; deleteBody: string; deleteCta: string;
    err: { generic: string; wrong: string; short: string; name: string };
  };
  limits: {
    meta: [string, string]; lede: string;
    allowanceH: string; allowanceLede: string; used: (u: string, l: string) => string; resets: (date: string) => string; more: string;
    rateH: string; rateLede: string; th: { what: string; limit: string }; perMin: (n: number) => string; playground: string; noKeys: string;
    requestH: string; requestLede: string; upload: string; audio: string; text: string; keys: string;
    mb: (n: number) => string; minutes: (n: number) => string; chars: (n: string) => string;
    errorsH: string; errorsLede: string; eth: { status: string; code: string; meaning: string };
    errors: [string, string, string][];
    revokeNote: (s: number) => string;
  };
  usage: {
    meta: [string, string]; lede: string; period: string;
    tiles: { audio: string; requests: string; chars: string; errors: string };
    of: (limit: string) => string; perDay: string; perDayNote: string; byEndpoint: string; empty: string; note: string;
    th: { endpoint: string; model: string; requests: string; audio: string; chars: string; errors: string };
    range: Record<"month" | "last" | "7d" | "30d", string>; by: { model: string; key: string }; groupBy: string; export: string;
    success: string; latency: string; key: string; byModel: string; byKey: string; playground: string; deleted: string; emptyRange: string;
  };
};

const MODELS_EN = {
  transcribe: { name: "Tatsuniya", task: "Speech to text" }, speech: { name: "Tafiya", task: "Text to speech" },
  translate: { name: "Kora", task: "Speech translation" }, converse: { name: "Aïr", task: "Voice conversation" },
};
const MODELS_FR = {
  transcribe: { name: "Tatsuniya", task: "Parole vers texte" }, speech: { name: "Tafiya", task: "Texte vers parole" },
  translate: { name: "Kora", task: "Traduction de la parole" }, converse: { name: "Aïr", task: "Conversation vocale" },
};

export const consoleCopy: Record<Lang, ConsoleCopy> = {
  en: {
    api: "API", menu: "Menu", openMenu: "Open menu", closeMenu: "Close menu", signedIn: "Signed in as",
    nav: { manage: "Manage", monitor: "Monitor", overview: "Home", keys: "API keys", usage: "Usage", logs: "Logs", limits: "Limits", settings: "Settings", build: "Build", playground: "Playground", docs: "Docs", reference: "API reference", admin: "Accounts" },
    access: { approved: "Beta", pending: "Setting up", denied: "Paused" },
    overview: {
      meta: ["Home", "Your Namu API account: keys, usage and a first request."],
      h1: name => (name ? `Welcome, ${name}` : "Welcome"), lede: "Speech models for the languages of the Sahel, behind one API.",
      audio: "Audio this month", minutes: (u, l) => `${u} of ${l} min`, requests: "Requests this month", keys: "Active keys", keysOf: (k, m) => `${k} of ${m}`,
      firstH: "Make your first request", firstLede: "Three steps from here to Hausa speech coming back from Tafiya.",
      step1: "Create a secret key", step2: "Keep it on your server, in an environment variable", step3: "Call an endpoint",
      createKey: "Create a key", envNote: "Never put a key in a browser, an app or a repository.",
      modelsH: "Models", modelsLede: "Each model is one endpoint. The same key calls all of them unless you restrict it.", endpoint: "Endpoint", read: "Read the docs",
      copy: "Copy", copied: "Copied",
      welcome: name => (name ? `Welcome back, ${name}` : "Welcome back"),
      startLede: "From here to Hausa speech coming back from Tafiya: a key, an environment variable, one request.",
      keyName: "Key name", keyNamePh: "My first key", creating: "Creating…", created: "Your key", shownOnce: "Copy it now: we keep only its fingerprint, so this is the only time it is shown.",
      tryFirst: "Or try the models first, no key needed:", playground: "Open the Playground", newKey: "Create API key",
      requests30: "Requests", success: "Success rate", latency: "Average latency", last30: "Last 30 days",
      recentH: "Recent requests", recentAll: "All logs", recentEmpty: "No requests yet.",
      tryH: "Try a model", tryLede: "Each one opens in the Playground, on your account.", tryIt: "Try", playgroundKey: "Playground",
      getStarted: "Get started", dismiss: "Dismiss",
      steps: [["Create an API key", "Keep it on your server"], ["Try the models", "In the Playground, no code"], ["Make your first request", "Hausa speech back in one call"]],
      quick: ["Developer quickstart", "Your first request in minutes"], pg: ["Open the Playground", "Every model, on your account"],
      period: "Period", ranges: { "24h": "24h", "7d": "7d", "14d": "14d", "30d": "30d" },
      m: { requests: "Requests", audio: "Audio", success: "Success rate", latency: "Average latency", chars: "Characters spoken", allowance: "Free allowance" },
      left: m => `${m} min left`, ofMonth: (l, d) => `of ${l} min this month · resets ${d}`, more: "Need more?",
    },
    keys: {
      lede: "Your secret keys are listed below. Do not share them, and never put one in a browser, an app or a repository: anyone holding a key can spend your allowance.",
      createNew: "Create new secret key", count: (k, m) => `${k} active of ${m}`, base: "Base URL", copyBase: "Copy the base URL",
      th: { name: "Name", secret: "Secret key", perms: "Permissions", created: "Created", lastUsed: "Last used", actions: "Actions" },
      all: "All", restricted: "Restricted", never: "Never", demo: "Website demo", revokeLabel: k => `Revoke ${k}`,
      revokedH: k => `Revoked keys (${k})`,
      emptyH: "No API keys yet", emptyBody: "Create a key to call the Namu API from your server.",
      createH: "Create new secret key", nameLabel: "Name", namePh: "My test key", permsLabel: "Permissions",
      permsAll: "All", permsRestricted: "Restricted", permsHelp: "Choose the models this key may call.",
      cancel: "Cancel", create: "Create secret key", creating: "Creating…",
      saveH: "Save your key", saveBody: "Copy it now and keep it somewhere safe, such as your server’s environment. For your security we keep only its fingerprint, so you will not be able to see it again.",
      copy: "Copy", copied: "Copied", copyFailed: "Not copied: the text is selected", done: "Done", permsOf: "Permissions",
      leaveQ: "Have you saved your key? It will not be shown again.", leaveBack: "Back to the key", leaveYes: "Yes, close",
      revokeH: "Revoke secret key", revokeBody: "This key will stop working within a minute, and requests made with it will be refused. Anything still using it will break. This cannot be undone.",
      revokeIt: "Revoke key", revoking: "Revoking…",
      editLabel: k => `Edit ${k}`, editH: "Edit secret key", save: "Save", saving: "Saving…",
      editNote: "The key itself does not change. New permissions reach the API within 30 seconds.", envHint: "Then, on your server:",
      models: MODELS_EN,
      error: "Something went wrong. Try again.",
    },
    playground: {
      meta: ["Playground", "Try Namu’s speech models in your browser, on your own account."],
      lede: "Try every model with your voice and your words. Requests run on your account: they count towards your allowance and appear in Logs.",
      modes: { speech: "Text to speech", transcribe: "Speech to text", translate: "Translate", converse: "Conversation" },
      settings: "Settings", model: "Model", voice: "Voice",
      voices: { nadia: ["Nadia", "Warm and patient · Hausa"] },
      textLabel: "Text", textPh: "Write something in Hausa to hear it spoken…", generate: "Generate", generating: "Generating…",
      input: "Audio", record: "Record", stopRec: "Stop", upload: "Upload a file", sample: "Use a sample",
      samples: { ha: "Hausa sample", fr: "French sample" },
      recording: s => `Recording · ${s}`, remove: "Remove", maxRec: (m, mb) => `Up to ${m} minutes (files up to ${mb} MB), any common audio format.`,
      transcribe: "Transcribe", transcribing: "Transcribing…", translate: "Translate", translating: "Translating…", send: "Send", sending: "Aïr is answering…",
      language: "Language", hausa: "Hausa", direction: "Direction", haFr: "Hausa → French", frHa: "French → Hausa",
      persona: "Persona", session: "Conversation", newSession: "Clear conversation", sessionNote: "Aïr answers each turn on its own and keeps no memory of earlier ones. Namu stores none of the conversation; the turns shown here stay on this page.",
      output: "Output", transcript: "Transcript", heard: "Heard", translation: "Translation", you: "You", air: "Aïr",
      empty: {
        speech: "Write something and press Generate. The voice comes back here.",
        transcribe: "Record or upload Hausa speech, then press Transcribe.",
        translate: "Record or upload speech, choose the direction, then press Translate.",
        converse: "Record a question in Hausa. Aïr answers it aloud.",
      },
      stats: { status: "Status", latency: "Latency", audio: "Audio", chars: "Characters" },
      download: "Download", copy: "Copy", copied: "Copied", copyFailed: "Not copied: the text is selected", play: "Play", pause: "Pause",
      code: "View code", codeH: "Use this request in your code", codeLede: "The same request as here, with your key read from NAMU_API_KEY.", close: "Close",
      wake: "The first request wakes the model: it can take about twenty seconds.", runsOn: "Runs on your account",
      history: "History", noHistory: "What you try here is listed in this tab until you leave the page.",
      errors: { mic: "Allow the microphone to record.", decode: "This file could not be read as audio.", long: m => `Keep it under ${m} minutes.`,
        big: mb => `This clip is too large for the Playground (${mb} MB at most). Larger files go through the API.`, generic: "Something went wrong. Try again." },
    },
    logs: {
      meta: ["Logs", "Every request to the Namu API from your keys and the Playground."],
      lede: "Every request from your keys and the Playground, newest first.",
      privacy: "Logs keep what was called, when and how it went: never the audio or the text.",
      range: { "24h": "24 hours", "7d": "7 days", "30d": "30 days" }, allModels: "All models", allKeys: "All keys", playground: "Playground",
      status: { all: "All statuses", ok: "Succeeded", errors: "Errors" },
      th: { time: "Time", model: "Model", key: "Key", status: "Status", audio: "Audio", chars: "Characters", latency: "Latency" },
      older: "Older requests", newest: "Back to newest",
      emptyH: "No requests here yet", emptyBody: "Requests appear here a few seconds after they are made.", emptyCta: "Open the Playground",
      deletedKey: "Deleted key",
    },
    settings: {
      meta: ["Settings", "Your Namu API profile, sign-in and account."],
      lede: "Your profile, how you sign in, and your account.",
      profileH: "Profile", name: "Name", save: "Save", saving: "Saving…", saved: "Saved", email: "Email", verified: "Verified", unverified: "Not verified",
      accountH: "Account", id: "Account ID", since: "Member since", plan: "Plan", planValue: m => `Beta · free, ${m} minutes of audio a month`, copy: "Copy", copied: "Copied", copyFailed: "Not copied: the text is selected",
      securityH: "Sign-in and security", methods: "Sign-in methods",
      method: { credential: "Email and password", google: "Google", github: "GitHub" },
      passwordH: "Change password", current: "Current password", next: "New password", change: "Change password", changing: "Changing…", changed: "Password changed.",
      rule: "At least 8 characters.",
      sessionsH: "Signed-in devices", sessionsBody: "Sign out everywhere, including this browser. Your API keys keep working.", signOutAll: "Sign out of all devices", signingOut: "Signing out…",
      deleteH: "Delete account", deleteBody: "Write to us from your account’s email address and we will delete the account, its keys and its usage records.", deleteCta: "Ask us to delete it",
      err: { generic: "Something went wrong. Try again.", wrong: "The current password is not right.", short: "Use at least 8 characters.", name: "Enter a name." },
    },
    limits: {
      meta: ["Limits", "Your Namu API allowance, rate limits and request limits."],
      lede: "What your account may use, and what the API answers when a limit is reached.",
      allowanceH: "Monthly audio", allowanceLede: "Free during the beta. Transcription and translation count the audio you send, speech counts the audio it returns, and a conversation counts both. A request that fails counts nothing.",
      used: (u, l) => `${u} of ${l} minutes used`, resets: d => `Resets on ${d} (UTC)`, more: "Need more? Write to us",
      rateH: "Rate limits", rateLede: "Requests per minute, counted per key. The Playground has its own limit.",
      th: { what: "Applies to", limit: "Limit" }, perMin: n => `${n} requests / minute`, playground: "Playground", noKeys: "No active keys yet.",
      requestH: "Request limits", requestLede: "Checked before a model runs, so a request that is too big costs nothing.",
      upload: "Audio file size", audio: "Audio length", text: "Text for speech", keys: "Active keys",
      mb: n => `${n} MB`, minutes: n => `${n} minutes`, chars: n => `${n} characters`,
      errorsH: "When you reach a limit", errorsLede: "Every error has the same shape: {\"error\": {\"type\", \"message\", \"request_id\"}}, and none of them counts against your allowance.",
      eth: { status: "Status", code: "Type", meaning: "What to do" },
      errors: [
        ["429", "rate_limited", "Too many requests for this key. Wait for the number of seconds in Retry-After."],
        ["429", "quota_exceeded", "The month’s audio allowance is used. It resets on the first of the month, or write to us."],
        ["413", "payload_too_large · audio_too_long · text_too_long", "The request is over a request limit above. Split it."],
        ["403", "insufficient_scope", "This key may not call this model. Edit the key’s permissions."],
        ["403", "account_paused", "The account is paused. Write to us."],
        ["401", "invalid_api_key · key_revoked", "Check the key, or create a new one."],
      ],
      revokeNote: s => `A revoked key stops working within ${s} seconds.`,
    },
    usage: {
      meta: ["Usage", "Your Namu API usage over time, by model or by key."], lede: "Requests, audio and characters over time, in UTC. Usage records hold durations, counts and status codes.",
      period: "This month",
      tiles: { audio: "Audio", requests: "Requests", chars: "Characters spoken", errors: "Errors" },
      of: l => `of ${l} min`, perDay: "Requests per day", perDayNote: "By model", byEndpoint: "By endpoint", empty: "No requests yet this month.",
      note: "Audio minutes count both the audio you send and the speech we return.",
      th: { endpoint: "Endpoint", model: "Model", requests: "Requests", audio: "Audio (min)", chars: "Characters", errors: "Errors" },
      range: { month: "This month", last: "Last month", "7d": "Last 7 days", "30d": "Last 30 days" }, by: { model: "By model", key: "By key" }, groupBy: "Group by", export: "Export CSV",
      success: "Success rate", latency: "Average latency", key: "Key", byModel: "By model", byKey: "By key", playground: "Playground", deleted: "Deleted key",
      emptyRange: "No requests in this period.",
    },
  },
  fr: {
    api: "API", menu: "Menu", openMenu: "Ouvrir le menu", closeMenu: "Fermer le menu", signedIn: "Connecté en tant que",
    nav: { manage: "Gérer", monitor: "Suivre", overview: "Accueil", keys: "Clés d’API", usage: "Consommation", logs: "Journaux", limits: "Limites", settings: "Paramètres", build: "Construire", playground: "Bac à sable", docs: "Documentation", reference: "Référence de l’API", admin: "Comptes" },
    access: { approved: "Bêta", pending: "Configuration", denied: "En pause" },
    overview: {
      meta: ["Accueil", "Votre compte API Namu : clés, consommation et une première requête.".replace(" :", `${n}:`)],
      h1: name => (name ? `Bienvenue, ${name}` : "Bienvenue"), lede: "Des modèles de parole pour les langues du Sahel, derrière une seule API.",
      audio: "Audio ce mois-ci", minutes: (u, l) => `${u} sur ${l} min`, requests: "Requêtes ce mois-ci", keys: "Clés actives", keysOf: (k, m) => `${k} sur ${m}`,
      firstH: "Faites votre première requête", firstLede: "Trois étapes entre ici et une phrase en haoussa prononcée par Tafiya.",
      step1: "Créez une clé secrète", step2: "Gardez-la sur votre serveur, dans une variable d’environnement", step3: "Appelez un point d’accès",
      createKey: "Créer une clé", envNote: "Ne mettez jamais une clé dans un navigateur, une application ou un dépôt.",
      modelsH: "Modèles", modelsLede: "Chaque modèle est un point d’accès. La même clé les appelle tous, sauf si vous la restreignez.", endpoint: "Point d’accès", read: "Lire la documentation",
      copy: "Copier", copied: "Copié",
      welcome: name => (name ? `Bon retour, ${name}` : "Bon retour"),
      startLede: "D’ici à une phrase en haoussa prononcée par Tafiya : une clé, une variable d’environnement, une requête.".replace(" :", `${n}:`),
      keyName: "Nom de la clé", keyNamePh: "Ma première clé", creating: "Création…", created: "Votre clé", shownOnce: "Copiez-la maintenant : nous n’en gardons que l’empreinte, elle ne s’affichera plus.".replace(" :", `${n}:`),
      tryFirst: `Ou essayez d’abord les modèles, sans clé${n}:`, playground: "Ouvrir le bac à sable", newKey: "Créer une clé d’API",
      requests30: "Requêtes", success: "Taux de réussite", latency: "Latence moyenne", last30: "30 derniers jours",
      recentH: "Requêtes récentes", recentAll: "Tous les journaux", recentEmpty: "Aucune requête pour l’instant.",
      tryH: "Essayer un modèle", tryLede: "Chacun s’ouvre dans le bac à sable, sur votre compte.", tryIt: "Essayer", playgroundKey: "Bac à sable",
      getStarted: "Pour commencer", dismiss: "Masquer",
      steps: [["Créer une clé d’API", "À garder sur votre serveur"], ["Essayer les modèles", "Dans le bac à sable, sans code"], ["Faire votre première requête", "De la parole en haoussa en un appel"]],
      quick: ["Démarrage rapide", "Votre première requête en quelques minutes"], pg: ["Ouvrir le bac à sable", "Tous les modèles, sur votre compte"],
      period: "Période", ranges: { "24h": "24 h", "7d": "7 j", "14d": "14 j", "30d": "30 j" },
      m: { requests: "Requêtes", audio: "Audio", success: "Taux de réussite", latency: "Latence moyenne", chars: "Caractères prononcés", allowance: "Allocation gratuite" },
      left: m => `${m} min restantes`, ofMonth: (l, d) => `sur ${l} min ce mois-ci · remise à zéro le ${d}`, more: `Besoin de plus${n}?`,
    },
    keys: {
      lede: `Vos clés secrètes sont listées ci-dessous. Ne les partagez pas, et ne mettez jamais une clé dans un navigateur, une application ou un dépôt${n}: quiconque la détient peut dépenser votre forfait.`,
      createNew: "Créer une clé secrète", count: (k, m) => `${k} active${k > 1 ? "s" : ""} sur ${m}`, base: "URL de base", copyBase: "Copier l’URL de base",
      th: { name: "Nom", secret: "Clé secrète", perms: "Permissions", created: "Créée le", lastUsed: "Dernier usage", actions: "Actions" },
      all: "Toutes", restricted: "Restreintes", never: "Jamais", demo: "Démo du site", revokeLabel: k => `Révoquer ${k}`,
      revokedH: k => `Clés révoquées (${k})`,
      emptyH: "Aucune clé d’API pour l’instant", emptyBody: "Créez une clé pour appeler l’API Namu depuis votre serveur.",
      createH: "Créer une clé secrète", nameLabel: "Nom", namePh: "Ma clé de test", permsLabel: "Permissions",
      permsAll: "Toutes", permsRestricted: "Restreintes", permsHelp: "Choisissez les modèles que cette clé peut appeler.",
      cancel: "Annuler", create: "Créer la clé secrète", creating: "Création…",
      saveH: "Enregistrez votre clé", saveBody: "Copiez-la maintenant et gardez-la en lieu sûr, par exemple dans l’environnement de votre serveur. Pour votre sécurité, nous n’en gardons que l’empreinte : vous ne pourrez plus la voir.".replace(" :", `${n}:`),
      copy: "Copier", copied: "Copiée", copyFailed: `Non copié${n}: le texte est sélectionné`, done: "Terminé", permsOf: "Permissions",
      leaveQ: `Avez-vous enregistré votre clé${n}? Elle ne sera plus affichée.`, leaveBack: "Revenir à la clé", leaveYes: "Oui, fermer",
      revokeH: "Révoquer la clé secrète", revokeBody: "Cette clé cessera de fonctionner en moins d’une minute et les requêtes qui l’utilisent seront refusées. Tout ce qui en dépend encore cessera de fonctionner. C’est irréversible.",
      revokeIt: "Révoquer la clé", revoking: "Révocation…",
      editLabel: k => `Modifier ${k}`, editH: "Modifier la clé secrète", save: "Enregistrer", saving: "Enregistrement…",
      editNote: "La clé elle-même ne change pas. Les nouvelles autorisations s’appliquent à l’API en moins de 30 secondes.", envHint: `Puis, sur votre serveur${n}:`,
      models: MODELS_FR,
      error: "Une erreur est survenue. Réessayez.",
    },
    playground: {
      meta: ["Bac à sable", "Essayez les modèles de parole de Namu dans votre navigateur, sur votre propre compte."],
      lede: "Essayez chaque modèle avec votre voix et vos mots. Les requêtes passent par votre compte : elles comptent dans votre allocation et apparaissent dans les journaux.".replace(" :", `${n}:`),
      modes: { speech: "Texte vers parole", transcribe: "Parole vers texte", translate: "Traduction", converse: "Conversation" },
      settings: "Réglages", model: "Modèle", voice: "Voix",
      voices: { nadia: ["Nadia", "Chaleureuse et patiente · haoussa"] },
      textLabel: "Texte", textPh: "Écrivez quelque chose en haoussa pour l’entendre…", generate: "Générer", generating: "Génération…",
      input: "Audio", record: "Enregistrer", stopRec: "Arrêter", upload: "Importer un fichier", sample: "Utiliser un exemple",
      samples: { ha: "Exemple en haoussa", fr: "Exemple en français" },
      recording: s => `Enregistrement · ${s}`, remove: "Retirer", maxRec: (m, mb) => `Jusqu’à ${m} minutes (fichiers de ${mb} Mo au plus), dans tout format audio courant.`,
      transcribe: "Transcrire", transcribing: "Transcription…", translate: "Traduire", translating: "Traduction…", send: "Envoyer", sending: "Aïr répond…",
      language: "Langue", hausa: "Haoussa", direction: "Sens", haFr: "Haoussa → français", frHa: "Français → haoussa",
      persona: "Personnage", session: "Conversation", newSession: "Effacer la conversation", sessionNote: `Aïr répond à chaque tour séparément et ne garde aucun souvenir des précédents. Namu ne conserve rien de la conversation${n}; les tours affichés ici restent sur cette page.`,
      output: "Résultat", transcript: "Transcription", heard: "Entendu", translation: "Traduction", you: "Vous", air: "Aïr",
      empty: {
        speech: "Écrivez quelque chose et appuyez sur Générer. La voix apparaît ici.",
        transcribe: "Enregistrez ou importez de la parole en haoussa, puis appuyez sur Transcrire.",
        translate: "Enregistrez ou importez de la parole, choisissez le sens, puis appuyez sur Traduire.",
        converse: "Enregistrez une question en haoussa. Aïr y répond à voix haute.",
      },
      stats: { status: "Statut", latency: "Latence", audio: "Audio", chars: "Caractères" },
      download: "Télécharger", copy: "Copier", copied: "Copié", copyFailed: `Non copié${n}: le texte est sélectionné`, play: "Lire", pause: "Pause",
      code: "Voir le code", codeH: "Utiliser cette requête dans votre code", codeLede: "La même requête qu’ici, avec votre clé lue dans NAMU_API_KEY.", close: "Fermer",
      wake: "La première requête réveille le modèle : cela peut prendre une vingtaine de secondes.".replace(" :", `${n}:`), runsOn: "Sur votre compte",
      history: "Historique", noHistory: "Ce que vous essayez ici s’affiche dans cet onglet jusqu’à ce que vous quittiez la page.",
      errors: { mic: "Autorisez le micro pour enregistrer.", decode: "Ce fichier n’a pas pu être lu comme de l’audio.", long: k => `Restez sous ${k} minutes.`,
        big: mb => `Ce clip est trop lourd pour le bac à sable (${mb} Mo au plus). Les fichiers plus lourds passent par l’API.`, generic: "Une erreur s’est produite. Réessayez." },
    },
    logs: {
      meta: ["Journaux", "Chaque requête à l’API Namu, depuis vos clés et le bac à sable."],
      lede: "Chaque requête de vos clés et du bac à sable, de la plus récente à la plus ancienne.",
      privacy: "Les journaux gardent ce qui a été appelé, quand et avec quel résultat : jamais l’audio ni le texte.".replace(" :", `${n}:`),
      range: { "24h": "24 heures", "7d": "7 jours", "30d": "30 jours" }, allModels: "Tous les modèles", allKeys: "Toutes les clés", playground: "Bac à sable",
      status: { all: "Tous les statuts", ok: "Réussies", errors: "Erreurs" },
      th: { time: "Heure", model: "Modèle", key: "Clé", status: "Statut", audio: "Audio", chars: "Caractères", latency: "Latence" },
      older: "Requêtes plus anciennes", newest: "Revenir aux plus récentes",
      emptyH: "Aucune requête ici pour l’instant", emptyBody: "Les requêtes apparaissent ici quelques secondes après leur envoi.", emptyCta: "Ouvrir le bac à sable",
      deletedKey: "Clé supprimée",
    },
    settings: {
      meta: ["Paramètres", "Votre profil, votre connexion et votre compte sur l’API Namu."],
      lede: "Votre profil, votre façon de vous connecter et votre compte.",
      profileH: "Profil", name: "Nom", save: "Enregistrer", saving: "Enregistrement…", saved: "Enregistré", email: "Adresse e-mail", verified: "Vérifiée", unverified: "Non vérifiée",
      accountH: "Compte", id: "Identifiant du compte", since: "Membre depuis", plan: "Offre", planValue: m => `Bêta · gratuite, ${m} minutes d’audio par mois`, copy: "Copier", copied: "Copié", copyFailed: `Non copié${n}: le texte est sélectionné`,
      securityH: "Connexion et sécurité", methods: "Moyens de connexion",
      method: { credential: "E-mail et mot de passe", google: "Google", github: "GitHub" },
      passwordH: "Changer de mot de passe", current: "Mot de passe actuel", next: "Nouveau mot de passe", change: "Changer le mot de passe", changing: "Modification…", changed: "Mot de passe modifié.",
      rule: "Au moins 8 caractères.",
      sessionsH: "Appareils connectés", sessionsBody: "Déconnectez-vous partout, y compris dans ce navigateur. Vos clés d’API continuent de fonctionner.", signOutAll: "Se déconnecter de tous les appareils", signingOut: "Déconnexion…",
      deleteH: "Supprimer le compte", deleteBody: "Écrivez-nous depuis l’adresse e-mail du compte : nous supprimerons le compte, ses clés et ses relevés de consommation.".replace(" :", `${n}:`), deleteCta: "Demander la suppression",
      err: { generic: "Une erreur s’est produite. Réessayez.", wrong: "Le mot de passe actuel est incorrect.", short: "Utilisez au moins 8 caractères.", name: "Indiquez un nom." },
    },
    limits: {
      meta: ["Limites", "Votre allocation, vos limites de débit et de requête sur l’API Namu."],
      lede: "Ce que votre compte peut utiliser, et ce que l’API répond quand une limite est atteinte.",
      allowanceH: "Audio mensuel", allowanceLede: "Gratuit pendant la bêta. La transcription et la traduction comptent l’audio envoyé, la synthèse compte l’audio renvoyé, et une conversation compte les deux. Une requête qui échoue ne compte pas.",
      used: (u, l) => `${u} sur ${l} minutes utilisées`, resets: d => `Remise à zéro le ${d} (UTC)`, more: `Besoin de plus${n}? Écrivez-nous`,
      rateH: "Limites de débit", rateLede: "Requêtes par minute, comptées par clé. Le bac à sable a sa propre limite.",
      th: { what: "S’applique à", limit: "Limite" }, perMin: k => `${k} requêtes / minute`, playground: "Bac à sable", noKeys: "Aucune clé active pour l’instant.",
      requestH: "Limites de requête", requestLede: "Vérifiées avant qu’un modèle ne tourne : une requête trop grosse ne coûte rien.".replace(" :", `${n}:`),
      upload: "Taille du fichier audio", audio: "Durée de l’audio", text: "Texte à lire", keys: "Clés actives",
      mb: k => `${k} Mo`, minutes: k => `${k} minutes`, chars: k => `${k} caractères`,
      errorsH: "Quand une limite est atteinte", errorsLede: `Chaque erreur a la même forme${n}: {"error": {"type", "message", "request_id"}}, et aucune ne compte dans votre allocation.`,
      eth: { status: "Statut", code: "Type", meaning: "Que faire" },
      errors: [
        ["429", "rate_limited", "Trop de requêtes pour cette clé. Attendez le nombre de secondes indiqué par Retry-After."],
        ["429", "quota_exceeded", "L’allocation audio du mois est épuisée. Elle repart le premier du mois, ou écrivez-nous."],
        ["413", "payload_too_large · audio_too_long · text_too_long", "La requête dépasse une limite ci-dessus. Découpez-la."],
        ["403", "insufficient_scope", "Cette clé n’a pas accès à ce modèle. Modifiez ses autorisations."],
        ["403", "account_paused", "Le compte est en pause. Écrivez-nous."],
        ["401", "invalid_api_key · key_revoked", "Vérifiez la clé, ou créez-en une nouvelle."],
      ],
      revokeNote: k => `Une clé révoquée cesse de fonctionner en moins de ${k} secondes.`,
    },
    usage: {
      meta: ["Consommation", "Votre consommation de l’API Namu dans le temps, par modèle ou par clé."], lede: "Requêtes, audio et caractères dans le temps, en UTC. Les relevés d’usage contiennent des durées, des nombres et des codes de statut.",
      period: "Ce mois-ci",
      tiles: { audio: "Audio", requests: "Requêtes", chars: "Caractères prononcés", errors: "Erreurs" },
      of: l => `sur ${l} min`, perDay: "Requêtes par jour", perDayNote: "Par modèle", byEndpoint: "Par point d’accès", empty: "Aucune requête ce mois-ci.",
      note: "Les minutes comptent l’audio envoyé et la parole renvoyée.",
      th: { endpoint: "Point d’accès", model: "Modèle", requests: "Requêtes", audio: "Audio (min)", chars: "Caractères", errors: "Erreurs" },
      range: { month: "Ce mois-ci", last: "Le mois dernier", "7d": "7 derniers jours", "30d": "30 derniers jours" }, by: { model: "Par modèle", key: "Par clé" }, groupBy: "Grouper", export: "Exporter en CSV",
      success: "Taux de réussite", latency: "Latence moyenne", key: "Clé", byModel: "Par modèle", byKey: "Par clé", playground: "Bac à sable", deleted: "Clé supprimée",
      emptyRange: "Aucune requête sur cette période.",
    },
  },
};
