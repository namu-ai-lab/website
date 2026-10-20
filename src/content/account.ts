/* Copy for the developer platform: sign-in, the keys dashboard, usage and beta review.
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication.
   Claims gate (same as content/api.ts): no prices, no performance numbers; limits are the gateway's real ones. */
import type { Lang } from "@/i18n/config";

const n = " ";   // narrow no-break space before French high punctuation

export type AccountCopy = {
  nav: { keys: string; usage: string; docs: string; admin: string; signOut: string; signIn: string; dashboard: string };
  notConfigured: string;
  login: {
    meta: [string, string]; eyebrow: string; h1: string; lede: string; sending: string;
    google: string; github: string; error: string; terms: string; none: string;
  };
  beta: {
    pendingH: string; pendingBody: string; useCase: string; useCasePh: string; save: string; saved: string;
    deniedH: string; deniedBody: string; contact: string;
  };
  keys: {
    meta: [string, string]; h1: string; lede: string; create: string; name: string; namePh: string; scopes: string;
    scopeNames: Record<string, string>; cancel: string; createIt: string; creating: string;
    secretH: string; secretBody: string; copy: string; copied: string; done: string;
    th: { name: string; key: string; scopes: string; created: string; lastUsed: string };
    never: string; revoke: string; revoked: string; confirmRevoke: (name: string) => string; empty: string;
    demo: string; limit: (n: number) => string; base: string; error: string;
  };
  usage: {
    meta: [string, string]; h1: string; lede: string; month: string; allowance: (used: string, limit: string) => string;
    th: { endpoint: string; requests: string; audio: string; chars: string; errors: string }; empty: string; note: string;
  };
  admin: {
    meta: [string, string]; h1: string; lede: string; th: { email: string; useCase: string; status: string; joined: string; allowance: string };
    approve: string; deny: string; status: Record<string, string>; minutes: string; empty: string;
  };
};

export const accountCopy: Record<Lang, AccountCopy> = {
  en: {
    nav: { keys: "API keys", usage: "Usage", docs: "Docs", admin: "Beta review", signOut: "Sign out", signIn: "Sign in", dashboard: "Dashboard" },
    notConfigured: "Accounts are not switched on for this deployment yet.",
    login: {
      meta: ["Sign in", "Sign in to the Namu API to create keys and see your usage."],
      eyebrow: "Namu API · Private beta", h1: "Sign in to build with Namu",
      lede: "Use your GitHub or Google account. We never see your password.",
      sending: "Opening…", google: "Continue with Google", github: "Continue with GitHub",
      error: "Sign-in did not complete. Try again.", none: "Sign-in is not switched on for this deployment yet.",
      terms: "The API is in private beta: after you sign in, we review each request by hand.",
    },
    beta: {
      pendingH: "Your beta request is in",
      pendingBody: "We review every account by hand and write to you when your keys are ready. Tell us what you are building, it helps us prioritise.",
      useCase: "What are you building?", useCasePh: "A Hausa voice line for a clinic in Maradi, captions for a radio station…",
      save: "Send", saved: "Thank you, we have it.",
      deniedH: "We cannot open the beta to this account yet",
      deniedBody: "Space in the private beta is limited. Write to us if you think we got this wrong.", contact: "Contact us",
    },
    keys: {
      meta: ["API keys", "Create and revoke your Namu API keys."],
      h1: "API keys", lede: "Keys authenticate your server with the Namu API. Keep them out of browsers and repositories.",
      create: "Create API key", name: "Name", namePh: "Production server", scopes: "Allowed models",
      scopeNames: { transcribe: "Tatsuniya · transcribe", speech: "Tafiya · speech", translate: "Kora · translate", converse: "Aïr · converse" },
      cancel: "Cancel", createIt: "Create key", creating: "Creating…",
      secretH: "Save your key now", secretBody: "This is the only time we show it. We keep a fingerprint, not the key, so we cannot show it again.",
      copy: "Copy", copied: "Copied", done: "I have saved it",
      th: { name: "Name", key: "Key", scopes: "Models", created: "Created", lastUsed: "Last used" },
      never: "Never", revoke: "Revoke", revoked: "Revoked",
      confirmRevoke: k => `Revoke “${k}”? Apps using it stop working within a minute. This cannot be undone.`,
      empty: "No keys yet.", demo: "Website demo",
      limit: k => `Up to ${k} active keys per account.`, base: "API base URL", error: "Something went wrong. Try again.",
    },
    usage: {
      meta: ["Usage", "Your Namu API usage this month."],
      h1: "Usage", lede: "Counted from the first of the month (UTC). Usage records hold durations, counts and status codes.",
      month: "This month", allowance: (u, l) => `${u} of ${l} minutes of audio`,
      th: { endpoint: "Endpoint", requests: "Requests", audio: "Audio (min)", chars: "Characters", errors: "Errors" },
      empty: "No requests yet this month.", note: "Audio minutes count both what you send and the speech we return.",
    },
    admin: {
      meta: ["Beta review", "Approve developers for the private beta."],
      h1: "Beta review", lede: "Approving an account lets it create keys. Denying it also stops its existing keys.",
      th: { email: "Email", useCase: "Building", status: "Status", joined: "Joined", allowance: "Minutes / month" },
      approve: "Approve", deny: "Deny", status: { pending: "Pending", approved: "Approved", denied: "Denied" }, minutes: "min",
      empty: "Nobody has signed up yet.",
    },
  },
  fr: {
    nav: { keys: "Clés d’API", usage: "Consommation", docs: "Documentation", admin: "Validation bêta", signOut: "Se déconnecter", signIn: "Se connecter", dashboard: "Tableau de bord" },
    notConfigured: "Les comptes ne sont pas encore activés sur ce déploiement.",
    login: {
      meta: ["Connexion", "Connectez-vous à l’API Namu pour créer des clés et suivre votre consommation."],
      eyebrow: "API Namu · Bêta privée", h1: "Connectez-vous pour construire avec Namu",
      lede: "Utilisez votre compte GitHub ou Google. Nous ne voyons jamais votre mot de passe.",
      sending: "Ouverture…", google: "Continuer avec Google", github: "Continuer avec GitHub",
      error: "La connexion n’a pas abouti. Réessayez.", none: "La connexion n’est pas encore activée sur ce déploiement.",
      terms: "L’API est en bêta privée : après votre connexion, nous examinons chaque demande à la main.".replace(" :", `${n}:`),
    },
    beta: {
      pendingH: "Votre demande d’accès est enregistrée",
      pendingBody: "Nous examinons chaque compte à la main et vous écrivons quand vos clés sont prêtes. Dites-nous ce que vous construisez, cela nous aide à prioriser.",
      useCase: `Que construisez-vous${n}?`, useCasePh: "Une ligne vocale en haoussa pour un centre de santé à Maradi, des sous-titres pour une radio…",
      save: "Envoyer", saved: "Merci, c’est noté.",
      deniedH: "Nous ne pouvons pas encore ouvrir la bêta à ce compte",
      deniedBody: "Les places de la bêta privée sont limitées. Écrivez-nous si vous pensez que c’est une erreur.", contact: "Nous écrire",
    },
    keys: {
      meta: ["Clés d’API", "Créez et révoquez vos clés d’API Namu."],
      h1: "Clés d’API", lede: "Les clés authentifient votre serveur auprès de l’API Namu. Ne les mettez ni dans un navigateur ni dans un dépôt.",
      create: "Créer une clé", name: "Nom", namePh: "Serveur de production", scopes: "Modèles autorisés",
      scopeNames: { transcribe: "Tatsuniya · transcription", speech: "Tafiya · synthèse", translate: "Kora · traduction", converse: "Aïr · conversation" },
      cancel: "Annuler", createIt: "Créer la clé", creating: "Création…",
      secretH: "Enregistrez votre clé maintenant", secretBody: "Elle n’est affichée qu’une seule fois. Nous gardons une empreinte, pas la clé : nous ne pourrons pas la réafficher.".replace(" :", `${n}:`),
      copy: "Copier", copied: "Copiée", done: "Je l’ai enregistrée",
      th: { name: "Nom", key: "Clé", scopes: "Modèles", created: "Créée le", lastUsed: "Dernier usage" },
      never: "Jamais", revoke: "Révoquer", revoked: "Révoquée",
      confirmRevoke: k => `Révoquer «${n}${k}${n}»${n}? Les applications qui l’utilisent s’arrêtent en moins d’une minute. C’est irréversible.`,
      empty: "Aucune clé pour l’instant.", demo: "Démo du site",
      limit: k => `Jusqu’à ${k} clés actives par compte.`, base: "URL de base de l’API", error: "Une erreur est survenue. Réessayez.",
    },
    usage: {
      meta: ["Consommation", "Votre consommation de l’API Namu ce mois-ci."],
      h1: "Consommation", lede: "Comptée depuis le premier du mois (UTC). Les relevés d’usage contiennent des durées, des nombres et des codes de statut.",
      month: "Ce mois-ci", allowance: (u, l) => `${u} sur ${l} minutes d’audio`,
      th: { endpoint: "Point d’accès", requests: "Requêtes", audio: "Audio (min)", chars: "Caractères", errors: "Erreurs" },
      empty: "Aucune requête ce mois-ci.", note: "Les minutes comptent l’audio envoyé et la parole renvoyée.",
    },
    admin: {
      meta: ["Validation bêta", "Validez les développeurs de la bêta privée."],
      h1: "Validation bêta", lede: "Valider un compte lui permet de créer des clés. Le refuser bloque aussi ses clés existantes.",
      th: { email: "Adresse", useCase: "Projet", status: "Statut", joined: "Inscription", allowance: "Minutes / mois" },
      approve: "Valider", deny: "Refuser", status: { pending: "En attente", approved: "Validé", denied: "Refusé" }, minutes: "min",
      empty: "Personne ne s’est encore inscrit.",
    },
  },
};
