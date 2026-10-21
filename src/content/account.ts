/* Copy for the developer platform: log in and sign up, the keys dashboard, usage and beta review.
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication.
   Claims gate (same as content/api.ts): no prices, no performance numbers; limits are the gateway's real ones. */
import type { Lang } from "@/i18n/config";

const n = " ";   // narrow no-break space before French high punctuation

export type AccountCopy = {
  nav: { keys: string; usage: string; docs: string; admin: string; signOut: string; signIn: string; dashboard: string };
  notConfigured: string;
  /** The doors (log in, sign up, reset), after auth.openai.com: one question per screen. */
  auth: {
    meta: { login: [string, string]; signup: [string, string]; reset: [string, string] };
    welcome: string; create: string; setup: string; passwordH: string;
    email: string; password: string; name: string; continue: string; edit: string; show: string; hide: string; forgot: string;
    noAccount: string; signUp: string; haveAccount: string; logIn: string; or: string; google: string; github: string;
    rule: string; beta: string;
    verifyH: string; verifyLede: (email: string) => string; code: string; resend: string; resent: string; wait: (s: number) => string;
    aboutH: string; aboutLede: string; project: string; skip: string;
    resetH: string; resetLede: string; sentH: string; sentLede: (email: string) => string; back: string;
    newH: string; newPassword: string; doneH: string; doneLede: string; expiredH: string; expiredLede: string; again: string;
    err: {
      generic: string; email: string; wrong: string; exists: string; short: string; long: string; name: string;
      code: string; expired: string; tries: string; rate: string; oauth: string;
    };
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
    auth: {
      meta: {
        login: ["Log in", "Log in to the Namu API to create keys and see your usage."],
        signup: ["Create an account", "Create an account for the Namu API."],
        reset: ["Reset your password", "Set a new password for your Namu API account."],
      },
      welcome: "Welcome back", create: "Create an account", setup: "Set up your account", passwordH: "Enter your password",
      email: "Email address", password: "Password", name: "Full name", continue: "Continue", edit: "Edit",
      show: "Show password", hide: "Hide password", forgot: "Forgot password?",
      noAccount: "Don’t have an account?", signUp: "Sign up", haveAccount: "Already have an account?", logIn: "Log in", or: "or",
      google: "Continue with Google", github: "Continue with GitHub",
      rule: "At least 8 characters", beta: "The Namu API is in private beta: we review each new account by hand.",
      verifyH: "Check your inbox", verifyLede: e => `Enter the 6-digit code we sent to ${e}. It works for 15 minutes.`,
      code: "Code", resend: "Send a new code", resent: "A new code is on its way.", wait: s => `New code in ${s}s`,
      aboutH: "What are you building?",
      aboutLede: "We review every account for the private beta by hand. A sentence or two helps us say yes sooner.",
      project: "Your project", skip: "Skip for now",
      resetH: "Reset your password", resetLede: "Enter your email address and we will send you a link to set a new one.",
      sentH: "Check your inbox", sentLede: e => `If there is an account for ${e}, a link to set a new password is on its way. It works for 15 minutes.`,
      back: "Back to log in",
      newH: "Set a new password", newPassword: "New password", doneH: "Your password is changed", doneLede: "Log in with your new password.",
      expiredH: "This link has expired", expiredLede: "Reset links work once, for 15 minutes. Ask for a new one.", again: "Send a new link",
      err: {
        generic: "Something went wrong. Try again.", email: "Enter a valid email address.",
        wrong: "Incorrect email address or password.", exists: "There is already an account with this email address. Log in instead.",
        short: "Use at least 8 characters.", long: "Use 128 characters or fewer.", name: "Enter your name.",
        code: "That code is not right. Check it and try again.", expired: "That code has expired. Send a new one.",
        tries: "Too many tries with this code. Send a new one.", rate: "Too many attempts. Wait a minute, then try again.",
        oauth: "Sign-in did not complete. Try again.",
      },
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
    auth: {
      meta: {
        login: ["Connexion", "Connectez-vous à l’API Namu pour créer des clés et suivre votre consommation."],
        signup: ["Créer un compte", "Créez un compte pour l’API Namu."],
        reset: ["Réinitialiser le mot de passe", "Choisissez un nouveau mot de passe pour votre compte API Namu."],
      },
      welcome: "Bon retour", create: "Créer un compte", setup: "Configurez votre compte", passwordH: "Saisissez votre mot de passe",
      email: "Adresse e-mail", password: "Mot de passe", name: "Nom complet", continue: "Continuer", edit: "Modifier",
      show: "Afficher le mot de passe", hide: "Masquer le mot de passe", forgot: `Mot de passe oublié${n}?`,
      noAccount: `Vous n’avez pas de compte${n}?`, signUp: "S’inscrire", haveAccount: `Vous avez déjà un compte${n}?`, logIn: "Se connecter", or: "ou",
      google: "Continuer avec Google", github: "Continuer avec GitHub",
      rule: "Au moins 8 caractères", beta: `L’API Namu est en bêta privée${n}: nous examinons chaque nouveau compte à la main.`,
      verifyH: "Consultez votre boîte de réception", verifyLede: e => `Saisissez le code à 6 chiffres envoyé à ${e}. Il est valable 15 minutes.`,
      code: "Code", resend: "Envoyer un nouveau code", resent: "Un nouveau code est en route.", wait: s => `Nouveau code dans ${s}${n}s`,
      aboutH: `Que construisez-vous${n}?`,
      aboutLede: "Nous examinons chaque compte de la bêta privée à la main. Une phrase ou deux nous aide à répondre plus vite.",
      project: "Votre projet", skip: "Plus tard",
      resetH: "Réinitialisez votre mot de passe", resetLede: "Saisissez votre adresse e-mail et nous vous enverrons un lien pour en choisir un nouveau.",
      sentH: "Consultez votre boîte de réception", sentLede: e => `Si un compte existe pour ${e}, un lien pour choisir un nouveau mot de passe est en route. Il est valable 15 minutes.`,
      back: "Retour à la connexion",
      newH: "Choisissez un nouveau mot de passe", newPassword: "Nouveau mot de passe", doneH: "Votre mot de passe a été modifié",
      doneLede: "Connectez-vous avec votre nouveau mot de passe.",
      expiredH: "Ce lien a expiré", expiredLede: "Un lien de réinitialisation sert une fois, pendant 15 minutes. Demandez-en un nouveau.",
      again: "Recevoir un nouveau lien",
      err: {
        generic: "Une erreur s’est produite. Réessayez.", email: "Saisissez une adresse e-mail valide.",
        wrong: "Adresse e-mail ou mot de passe incorrect.", exists: "Un compte existe déjà avec cette adresse. Connectez-vous.",
        short: "Utilisez au moins 8 caractères.", long: "Utilisez 128 caractères au maximum.", name: "Indiquez votre nom.",
        code: "Ce code est incorrect. Vérifiez-le et réessayez.", expired: "Ce code a expiré. Demandez-en un nouveau.",
        tries: "Trop d’essais avec ce code. Demandez-en un nouveau.", rate: "Trop de tentatives. Patientez une minute, puis réessayez.",
        oauth: "La connexion n’a pas abouti. Réessayez.",
      },
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
