/* The developer docs: prose in two languages, code shared. Every limit and error here is the gateway's real
   behaviour (platform/modal/namu_gateway.py); change them together.
   FR-REVIEW: drafted French, to be reviewed by a native French speaker before publication.
   HA-REVIEW: the Hausa sample sentence needs a native speaker's check. */
import type { Lang } from "@/i18n/config";

const n = " ";

export type Endpoint = { id: string; model: string; method: "POST"; path: string; title: string; body: string; params: [string, string][]; returns: string };

export type DocsCopy = {
  meta: [string, string]; eyebrow: string; h1: string; lede: string; toc: string;
  quickH: string; quick: string[]; getKey: string; forAgents: string;
  authH: string; auth: string; authWarn: string;
  endpointsH: string; endpoints: Endpoint[]; paramsH: string; returnsH: string;
  errorsH: string; errorsSub: string; errors: [string, string, string][];
  limitsH: string; limits: [string, string][];
  livekitH: string; livekit: string;
  status: string;
};

export const SAMPLE_HA = "Barka da safiya! Ga labaran yau.";

export const docsCopy: Record<Lang, DocsCopy> = {
  en: {
    meta: ["API docs", "Call the Namu speech models from your own app: authentication, endpoints, errors and limits."],
    eyebrow: "Namu API · Beta", h1: "API documentation",
    lede: "One REST API for the Lab’s speech models. Send audio or text with your key, get text or audio back.",
    toc: "On this page",
    quickH: "Quickstart",
    quick: ["Create an account: it is free during the beta.", "Create a key in the dashboard and store it as NAMU_API_KEY on your server.", "Call an endpoint, for example text to speech:"],
    getKey: "Get an API key", forAgents: "For coding agents",
    authH: "Authentication",
    auth: "Send your key in the Authorization header of every request: Authorization: Bearer namu_sk_… Keys can be limited to some models when you create them, and revoked at any time.",
    authWarn: "Keep keys on your server. Anyone holding a key can spend your allowance; never put one in a web page, a mobile app or a repository.",
    endpointsH: "Endpoints",
    paramsH: "Parameters", returnsH: "Returns",
    endpoints: [
      { id: "speech", model: "Tafiya", method: "POST", path: "/v1/speech", title: "Text to speech",
        body: "Turns Hausa or French text into speech. Send JSON.",
        params: [["text", "Required. Up to 2,000 characters."], ["voice", "nadia (Hausa, default), salim (Hausa) or fr (French). See GET /v1/voices."], ["format", "wav (default), mp3, opus (Ogg Opus, for WhatsApp voice notes) or json (base64 WAV in JSON)."]],
        returns: "audio/wav (24 kHz mono), audio/mpeg or audio/ogg, with the duration in the X-Audio-Seconds header." },
      { id: "transcribe", model: "Tatsuniya", method: "POST", path: "/v1/transcribe", title: "Speech to text",
        body: "Transcribes Hausa speech. Send the audio as the raw request body or as a multipart field named file.",
        params: [["file", "WAV, MP3, M4A, AAC, OGG, WebM or FLAC; up to 25 MB and 5 minutes."], ["language", "ha (the default and, for now, the only value)."]],
        returns: "{ model, text, language, audio_seconds }" },
      { id: "translate", model: "Kora", method: "POST", path: "/v1/translate", title: "Speech translation",
        body: "Hausa to French or French to Hausa, from speech or from text. For text, send JSON instead of audio.",
        params: [["file", "The spoken audio, as for /v1/transcribe."], ["text", "Or, in JSON, the text to translate: up to 2,000 characters. It counts as the time it takes to say (about 15 characters a second)."], ["target", "fr (default) or ha. The source is the other one."], ["include_audio", "true to also receive the translation spoken (base64 WAV)."]],
        returns: "{ model, source, target, source_text, text, audio_seconds | characters, audio? }" },
      { id: "converse", model: "Aïr", method: "POST", path: "/v1/converse", title: "Voice conversation (research)",
        body: "One spoken turn with a Hausa voice agent. Reuse a session_id to keep the conversation’s memory. In research: behaviour may change.",
        params: [["file", "The user’s spoken turn."], ["persona", "nadia (default) or salim."], ["session_id", "Optional, your own id (up to 100 characters). The turns of a session are kept so the conversation can continue, under your account."]],
        returns: "{ model, persona, session_id, heard, reply, audio, sample_rate, audio_seconds }" },
    ],
    errorsH: "Errors", errorsSub: "Errors are JSON: { \"error\": { \"type\", \"message\", \"request_id\" } }; every response also carries X-Request-Id. Retry 429 after the Retry-After header, and 502 or 504 after a short wait. A request that fails counts nothing against your allowance.",
    errors: [
      ["400", "invalid_json · invalid_request · missing_text · missing_file · empty_audio · unknown_voice · unsupported_language · unsupported_pair · unknown_persona", "The request is incomplete, or names a voice, language or persona the model does not offer."],
      ["401", "missing_api_key · invalid_api_key · key_revoked", "No key, an unknown key, or a revoked one."],
      ["403", "account_paused · insufficient_scope", "The account is paused, or the key may not call this model."],
      ["413", "payload_too_large · audio_too_long · text_too_long", "Over a request limit (below)."],
      ["404", "not_found", "No such endpoint."],
      ["405", "method_not_allowed", "The endpoint does not take that method."],
      ["415", "unsupported_audio", "The audio is not WAV, MP3, M4A, AAC, OGG, WebM or FLAC, or could not be decoded."],
      ["422", "nothing_heard", "Translate or converse heard no speech in the audio."],
      ["429", "rate_limited · quota_exceeded", "Too many requests this minute, or the monthly allowance is used up."],
      ["500", "internal_error · encode_failed", "Something failed on our side, or the speech could not be encoded in that format. Safe to retry; if it persists, send us the request_id."],
      ["502", "upstream_error", "A model service did not answer. Safe to retry."],
      ["503", "auth_unavailable", "Keys could not be checked for a moment. Safe to retry."],
      ["504", "upstream_timeout", "A model took too long, often while it was waking up. Safe to retry."],
    ],
    limitsH: "Limits",
    limits: [["Audio per request", "25 MB and 5 minutes"], ["Text per request", "2,000 characters"], ["Requests", "60 per minute per key (can be raised)"],
      ["Monthly audio", "30 minutes per account during the beta (can be raised)"], ["Active keys", "10 per account"], ["First request", "slower while a model wakes up"], ["Long requests", "past 150 s, a 303 to the result: follow redirects (curl -L)"]],
    livekitH: "Voice agents (LiveKit)",
    livekit: "Building a phone or WebRTC agent? Call /v1/transcribe and /v1/speech from your agent’s server.",
    status: "Endpoints are provisional during the beta and may change. Translation, French speech recognition and conversation replies use Google Gemini through OpenRouter.",
  },
  fr: {
    meta: ["Documentation de l’API", `Appelez les modèles de parole de Namu depuis votre application${n}: authentification, points d’accès, erreurs et limites.`],
    eyebrow: "API Namu · Bêta", h1: "Documentation de l’API",
    lede: "Une API REST pour les modèles de parole du Lab. Envoyez de l’audio ou du texte avec votre clé, recevez du texte ou de l’audio.",
    toc: "Sur cette page",
    quickH: "Démarrage rapide",
    quick: [`Créez un compte${n}: c’est gratuit pendant la bêta.`, "Créez une clé dans le tableau de bord et gardez-la sur votre serveur sous le nom NAMU_API_KEY.", `Appelez un point d’accès, par exemple la synthèse vocale${n}:`],
    getKey: "Obtenir une clé d’API", forAgents: "Pour les agents de code",
    authH: "Authentification",
    auth: `Envoyez votre clé dans l’en-tête Authorization de chaque requête${n}: Authorization: Bearer namu_sk_… Une clé peut être limitée à certains modèles à sa création, et révoquée à tout moment.`,
    authWarn: `Gardez les clés sur votre serveur. Quiconque détient une clé peut consommer votre quota${n}; ne la mettez jamais dans une page web, une application mobile ou un dépôt.`,
    endpointsH: "Points d’accès",
    paramsH: "Paramètres", returnsH: "Réponse",
    endpoints: [
      { id: "speech", model: "Tafiya", method: "POST", path: "/v1/speech", title: "Synthèse vocale",
        body: "Transforme un texte en haoussa ou en français en parole. Envoyez du JSON.",
        params: [["text", "Obligatoire. Jusqu’à 2 000 caractères."], ["voice", "nadia (haoussa, par défaut), salim (haoussa) ou fr (français). Voir GET /v1/voices."], ["format", "wav (par défaut), mp3, opus (Ogg Opus, pour les notes vocales WhatsApp) ou json (WAV en base64 dans du JSON)."]],
        returns: "audio/wav (24 kHz mono), audio/mpeg ou audio/ogg, avec la durée dans l’en-tête X-Audio-Seconds." },
      { id: "transcribe", model: "Tatsuniya", method: "POST", path: "/v1/transcribe", title: "Transcription",
        body: "Transcrit la parole en haoussa. Envoyez l’audio comme corps brut de la requête ou dans un champ multipart nommé file.",
        params: [["file", `WAV, MP3, M4A, AAC, OGG, WebM ou FLAC${n}; jusqu’à 25 Mo et 5 minutes.`], ["language", "ha (la valeur par défaut et, pour l’instant, la seule)."]],
        returns: "{ model, text, language, audio_seconds }" },
      { id: "translate", model: "Kora", method: "POST", path: "/v1/translate", title: "Traduction de la parole",
        body: "Du haoussa vers le français ou du français vers le haoussa, à partir de la parole ou d’un texte. Pour un texte, envoyez du JSON au lieu de l’audio.",
        params: [["file", "L’audio parlé, comme pour /v1/transcribe."], ["text", `Ou, en JSON, le texte à traduire${n}: jusqu’à 2 000 caractères. Il compte pour le temps qu’il faut pour le dire (environ 15 caractères par seconde).`], ["target", "fr (par défaut) ou ha. La source est l’autre langue."], ["include_audio", "true pour recevoir aussi la traduction parlée (WAV en base64)."]],
        returns: "{ model, source, target, source_text, text, audio_seconds | characters, audio? }" },
      { id: "converse", model: "Aïr", method: "POST", path: "/v1/converse", title: "Conversation vocale (recherche)",
        body: `Un tour de parole avec un agent vocal en haoussa. Réutilisez un session_id pour garder la mémoire de la conversation. En recherche${n}: le comportement peut changer.`,
        params: [["file", "Le tour de parole de l’utilisateur."], ["persona", "nadia (par défaut) ou salim."], ["session_id", "Facultatif, votre propre identifiant (jusqu’à 100 caractères). Les tours d’une session sont conservés, rattachés à votre compte, pour que la conversation puisse continuer."]],
        returns: "{ model, persona, session_id, heard, reply, audio, sample_rate, audio_seconds }" },
    ],
    errorsH: "Erreurs", errorsSub: `Les erreurs sont en JSON${n}: { "error": { "type", "message", "request_id" } }${n}; chaque réponse porte aussi X-Request-Id. Réessayez un 429 après l’en-tête Retry-After, et un 502 ou 504 après une courte attente. Une requête qui échoue ne compte pas dans votre allocation.`,
    errors: [
      ["400", "invalid_json · invalid_request · missing_text · missing_file · empty_audio · unknown_voice · unsupported_language · unsupported_pair · unknown_persona", "La requête est incomplète, ou demande une voix, une langue ou un personnage que le modèle ne propose pas."],
      ["401", "missing_api_key · invalid_api_key · key_revoked", "Pas de clé, une clé inconnue ou une clé révoquée."],
      ["403", "account_paused · insufficient_scope", "Le compte est en pause, ou la clé n’a pas accès à ce modèle."],
      ["413", "payload_too_large · audio_too_long · text_too_long", "Au-delà d’une limite de requête (ci-dessous)."],
      ["404", "not_found", "Ce point d’accès n’existe pas."],
      ["405", "method_not_allowed", "Ce point d’accès n’accepte pas cette méthode."],
      ["415", "unsupported_audio", "L’audio n’est pas en WAV, MP3, M4A, AAC, OGG, WebM ou FLAC, ou n’a pas pu être décodé."],
      ["422", "nothing_heard", "La traduction ou la conversation n’a entendu aucune parole dans l’audio."],
      ["429", "rate_limited · quota_exceeded", "Trop de requêtes cette minute, ou le quota mensuel est épuisé."],
      ["500", "internal_error · encode_failed", `Une erreur de notre côté, ou la parole n’a pas pu être encodée dans ce format. Vous pouvez réessayer${n}; si elle persiste, envoyez-nous le request_id.`],
      ["502", "upstream_error", "Un service de modèle n’a pas répondu. Vous pouvez réessayer."],
      ["503", "auth_unavailable", "Les clés n’ont pas pu être vérifiées un instant. Vous pouvez réessayer."],
      ["504", "upstream_timeout", "Un modèle a mis trop de temps, souvent pendant son démarrage. Vous pouvez réessayer."],
    ],
    limitsH: "Limites",
    limits: [["Audio par requête", "25 Mo et 5 minutes"], ["Texte par requête", "2 000 caractères"], ["Requêtes", "60 par minute et par clé (peut être relevé)"],
      ["Audio mensuel", "30 minutes par compte pendant la bêta (peut être relevé)"], ["Clés actives", "10 par compte"], ["Première requête", "plus lente, le temps qu’un modèle démarre"], ["Requêtes longues", `après 150 s, une redirection 303 vers le résultat${n}: suivez les redirections (curl -L)`]],
    livekitH: "Agents vocaux (LiveKit)",
    livekit: `Vous construisez un agent téléphonique ou WebRTC${n}? Appelez /v1/transcribe et /v1/speech depuis le serveur de votre agent.`,
    status: `Les points d’accès sont provisoires pendant la bêta et peuvent changer. La traduction, la reconnaissance du français et les réponses de conversation s’appuient sur Google Gemini via OpenRouter.`,
  },
};

/* Code samples, identical in both languages. `base` is the API base URL; `speech` the sentence and voice the
   speech sample says. */
export function samples(base: string, speech = { text: SAMPLE_HA, voice: "nadia" }): Record<string, Record<"cURL" | "Python" | "JavaScript", string>> {
  const { text, voice } = speech;
  return {
    speech: {
      cURL: `curl ${base}/v1/speech \\
  -H "Authorization: Bearer $NAMU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "${text}", "voice": "${voice}"}' \\
  -o labarai.wav`,
      Python: `import os, requests

r = requests.post(
    "${base}/v1/speech",
    headers={"Authorization": f"Bearer {os.environ['NAMU_API_KEY']}"},
    json={"text": "${text}", "voice": "${voice}"},
    timeout=120,
)
r.raise_for_status()
open("labarai.wav", "wb").write(r.content)`,
      JavaScript: `import { writeFile } from "node:fs/promises";

const r = await fetch("${base}/v1/speech", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.NAMU_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ text: "${text}", voice: "${voice}" }),
});
if (!r.ok) throw new Error((await r.json()).error.message);
await writeFile("labarai.wav", Buffer.from(await r.arrayBuffer()));`,
    },
    transcribe: {
      cURL: `curl ${base}/v1/transcribe \\
  -H "Authorization: Bearer $NAMU_API_KEY" \\
  -F file=@labarai.wav`,
      Python: `import os, requests

with open("labarai.wav", "rb") as f:
    r = requests.post(
        "${base}/v1/transcribe",
        headers={"Authorization": f"Bearer {os.environ['NAMU_API_KEY']}"},
        files={"file": f},
        timeout=120,
    )
r.raise_for_status()
print(r.json()["text"])`,
      JavaScript: `import { readFile } from "node:fs/promises";

const form = new FormData();
form.append("file", new Blob([await readFile("labarai.wav")]), "labarai.wav");
const r = await fetch("${base}/v1/transcribe", {
  method: "POST",
  headers: { Authorization: \`Bearer \${process.env.NAMU_API_KEY}\` },
  body: form,
});
console.log((await r.json()).text);`,
    },
    translate: {
      cURL: `curl ${base}/v1/translate \\
  -H "Authorization: Bearer $NAMU_API_KEY" \\
  -F file=@question.wav -F target=fr`,
      Python: `import os, requests

with open("question.wav", "rb") as f:
    r = requests.post(
        "${base}/v1/translate",
        headers={"Authorization": f"Bearer {os.environ['NAMU_API_KEY']}"},
        files={"file": f},
        data={"target": "fr"},
        timeout=120,
    )
out = r.json()
print(out["source_text"], "->", out["text"])`,
      JavaScript: `const form = new FormData();
form.append("file", audioBlob, "question.wav");
form.append("target", "fr");
const r = await fetch("${base}/v1/translate", {
  method: "POST",
  headers: { Authorization: \`Bearer \${process.env.NAMU_API_KEY}\` },
  body: form,
});
const { source_text, text } = await r.json();`,
    },
    translateText: {
      cURL: `curl ${base}/v1/translate \\
  -H "Authorization: Bearer $NAMU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Bonjour à tous.", "source": "fr", "target": "ha"}'`,
      Python: `import os, requests

r = requests.post(
    "${base}/v1/translate",
    headers={"Authorization": f"Bearer {os.environ['NAMU_API_KEY']}"},
    json={"text": "Bonjour à tous.", "source": "fr", "target": "ha"},
    timeout=120,
)
r.raise_for_status()
print(r.json()["text"])`,
      JavaScript: `const r = await fetch("${base}/v1/translate", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.NAMU_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ text: "Bonjour à tous.", source: "fr", target: "ha" }),
});
const { text } = await r.json();`,
    },
    converse: {
      cURL: `curl ${base}/v1/converse \\
  -H "Authorization: Bearer $NAMU_API_KEY" \\
  -F file=@turn.wav -F persona=nadia -F session_id=user-42`,
      Python: `import base64, os, requests

with open("turn.wav", "rb") as f:
    r = requests.post(
        "${base}/v1/converse",
        headers={"Authorization": f"Bearer {os.environ['NAMU_API_KEY']}"},
        files={"file": f},
        data={"persona": "nadia", "session_id": "user-42"},   # reuse the session_id so Aïr remembers
        timeout=300,                                           # the first turn can wait for the models to wake
    )
r.raise_for_status()
out = r.json()
print(out["heard"], "->", out["reply"])
open("reply.wav", "wb").write(base64.b64decode(out["audio"]))`,
      JavaScript: `const form = new FormData();
form.append("file", turnBlob, "turn.wav");
form.append("persona", "nadia");
form.append("session_id", "user-42");
const r = await fetch("${base}/v1/converse", {
  method: "POST",
  headers: { Authorization: \`Bearer \${process.env.NAMU_API_KEY}\` },
  body: form,
});
const { heard, reply, audio } = await r.json();   // audio: base64 WAV`,
    },
  };
}
