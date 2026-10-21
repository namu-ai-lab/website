/* Copy for the developer console (the signed-in pages), after platform.openai.com: its chrome, the overview, the
   keys table and the usage page. The older strings it still uses live in content/account.ts.
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication.
   Claims gate (as content/api.ts): no prices, no performance numbers; limits are the gateway's real ones. */
import type { Lang } from "@/i18n/config";

const n = " ";   // narrow no-break space before French high punctuation

export type ConsoleCopy = {
  api: string; menu: string; signedIn: string;
  nav: { manage: string; overview: string; keys: string; usage: string; build: string; playground: string; docs: string; reference: string; admin: string };
  access: { approved: string; pending: string; denied: string };
  overview: {
    meta: [string, string]; h1: (name: string) => string; lede: string;
    audio: string; minutes: (used: string, limit: string) => string; requests: string; keys: string; keysOf: (n: number, max: number) => string;
    firstH: string; firstLede: string; step1: string; step2: string; step3: string; createKey: string; envNote: string;
    modelsH: string; modelsLede: string; endpoint: string; read: string; copy: string; copied: string;
  };
  keys: {
    lede: string; createNew: string; count: (n: number, max: number) => string; base: string; copyBase: string;
    th: { name: string; secret: string; perms: string; created: string; lastUsed: string; actions: string };
    all: string; restricted: string; never: string; demo: string; revokeLabel: (name: string) => string;
    revokedH: (n: number) => string;
    emptyH: string; emptyBody: string;
    createH: string; nameLabel: string; namePh: string; permsLabel: string; permsAll: string; permsRestricted: string; permsHelp: string;
    cancel: string; create: string; creating: string;
    saveH: string; saveBody: string; copy: string; copied: string; done: string; permsOf: string;
    revokeH: string; revokeBody: string; revokeIt: string; revoking: string;
    models: Record<string, { name: string; task: string }>;
    error: string;
  };
  usage: {
    meta: [string, string]; lede: string; period: string;
    tiles: { audio: string; requests: string; chars: string; errors: string };
    of: (limit: string) => string; perDay: string; perDayNote: string; byEndpoint: string; empty: string; note: string;
    th: { endpoint: string; model: string; requests: string; audio: string; chars: string; errors: string };
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
    api: "API", menu: "Menu", signedIn: "Signed in as",
    nav: { manage: "Manage", overview: "Overview", keys: "API keys", usage: "Usage", build: "Build", playground: "Playground", docs: "Docs", reference: "API reference", admin: "Accounts" },
    access: { approved: "Beta", pending: "Setting up", denied: "Paused" },
    overview: {
      meta: ["Overview", "Your Namu API account: keys, usage and a first request."],
      h1: name => (name ? `Welcome, ${name}` : "Welcome"), lede: "Speech models for the languages of the Sahel, behind one API.",
      audio: "Audio this month", minutes: (u, l) => `${u} of ${l} min`, requests: "Requests this month", keys: "Active keys", keysOf: (k, m) => `${k} of ${m}`,
      firstH: "Make your first request", firstLede: "Three steps from here to Hausa speech coming back from Tafiya.",
      step1: "Create a secret key", step2: "Keep it on your server, in an environment variable", step3: "Call an endpoint",
      createKey: "Create a key", envNote: "Never put a key in a browser, an app or a repository.",
      modelsH: "Models", modelsLede: "Each model is one endpoint. The same key calls all of them unless you restrict it.", endpoint: "Endpoint", read: "Read the docs",
      copy: "Copy", copied: "Copied",
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
      copy: "Copy", copied: "Copied", done: "Done", permsOf: "Permissions",
      revokeH: "Revoke secret key", revokeBody: "This key will stop working within a minute, and requests made with it will be refused. Anything still using it will break. This cannot be undone.",
      revokeIt: "Revoke key", revoking: "Revoking…",
      models: MODELS_EN,
      error: "Something went wrong. Try again.",
    },
    usage: {
      meta: ["Usage", "Your Namu API usage this month."], lede: "Counted from the first of the month, in UTC. Usage records hold durations, counts and status codes.",
      period: "This month",
      tiles: { audio: "Audio", requests: "Requests", chars: "Characters spoken", errors: "Errors" },
      of: l => `of ${l} min`, perDay: "Requests per day", perDayNote: "By model", byEndpoint: "By endpoint", empty: "No requests yet this month.",
      note: "Audio minutes count both the audio you send and the speech we return.",
      th: { endpoint: "Endpoint", model: "Model", requests: "Requests", audio: "Audio (min)", chars: "Characters", errors: "Errors" },
    },
  },
  fr: {
    api: "API", menu: "Menu", signedIn: "Connecté en tant que",
    nav: { manage: "Gérer", overview: "Vue d’ensemble", keys: "Clés d’API", usage: "Consommation", build: "Construire", playground: "Bac à sable", docs: "Documentation", reference: "Référence de l’API", admin: "Comptes" },
    access: { approved: "Bêta", pending: "Configuration", denied: "En pause" },
    overview: {
      meta: ["Vue d’ensemble", "Votre compte API Namu : clés, consommation et une première requête.".replace(" :", `${n}:`)],
      h1: name => (name ? `Bienvenue, ${name}` : "Bienvenue"), lede: "Des modèles de parole pour les langues du Sahel, derrière une seule API.",
      audio: "Audio ce mois-ci", minutes: (u, l) => `${u} sur ${l} min`, requests: "Requêtes ce mois-ci", keys: "Clés actives", keysOf: (k, m) => `${k} sur ${m}`,
      firstH: "Faites votre première requête", firstLede: "Trois étapes entre ici et une phrase en haoussa prononcée par Tafiya.",
      step1: "Créez une clé secrète", step2: "Gardez-la sur votre serveur, dans une variable d’environnement", step3: "Appelez un point d’accès",
      createKey: "Créer une clé", envNote: "Ne mettez jamais une clé dans un navigateur, une application ou un dépôt.",
      modelsH: "Modèles", modelsLede: "Chaque modèle est un point d’accès. La même clé les appelle tous, sauf si vous la restreignez.", endpoint: "Point d’accès", read: "Lire la documentation",
      copy: "Copier", copied: "Copié",
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
      copy: "Copier", copied: "Copiée", done: "Terminé", permsOf: "Permissions",
      revokeH: "Révoquer la clé secrète", revokeBody: "Cette clé cessera de fonctionner en moins d’une minute et les requêtes qui l’utilisent seront refusées. Tout ce qui en dépend encore cessera de fonctionner. C’est irréversible.",
      revokeIt: "Révoquer la clé", revoking: "Révocation…",
      models: MODELS_FR,
      error: "Une erreur est survenue. Réessayez.",
    },
    usage: {
      meta: ["Consommation", "Votre consommation de l’API Namu ce mois-ci."], lede: "Comptée depuis le premier du mois, en UTC. Les relevés d’usage contiennent des durées, des nombres et des codes de statut.",
      period: "Ce mois-ci",
      tiles: { audio: "Audio", requests: "Requêtes", chars: "Caractères prononcés", errors: "Erreurs" },
      of: l => `sur ${l} min`, perDay: "Requêtes par jour", perDayNote: "Par modèle", byEndpoint: "Par point d’accès", empty: "Aucune requête ce mois-ci.",
      note: "Les minutes comptent l’audio envoyé et la parole renvoyée.",
      th: { endpoint: "Point d’accès", model: "Modèle", requests: "Requêtes", audio: "Audio (min)", chars: "Caractères", errors: "Erreurs" },
    },
  },
};
