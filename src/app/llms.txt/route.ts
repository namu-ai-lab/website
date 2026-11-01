import { docsCopy, samples } from "@/content/docs";
import { site } from "@/content/site";
import { LANGUAGES, MODELS, VOICES, language, languagesFor, type Model, type Task } from "@/lib/catalog";
import { LIMITS } from "@/lib/limits";
import { apiBase } from "@/lib/public-config";

/* /llms.txt: the API in one plain page for coding agents (the llms.txt convention), drawn from the same catalog and
   docs the console and /docs use, so it cannot drift from them. English; static. */
export const dynamic = "force-static";

const TASK: Record<Task, string> = { speech: "text to speech", transcribe: "speech to text", translate: "translation", converse: "voice conversation" };

export function GET() {
  const d = docsCopy.en, code = samples(apiBase);
  const tasksOf = (c: string) => (Object.keys(TASK) as Task[]).filter(t => (languagesFor(t) as string[]).includes(c));
  const lines = [
    "# Namu API",
    "",
    "> Speech models for the languages of the Sahel: text to speech, speech to text, translation and voice conversation. Beta: free, 30 minutes of audio a month per account.",
    "",
    `Base URL: ${apiBase}`,
    `Auth: send \`Authorization: Bearer $NAMU_API_KEY\` on every request. Create a key at ${site.url}/account/keys and keep it on a server, never in a web page or mobile app.`,
    `Docs: ${site.url}/docs`,
    "",
    "## First request",
    "",
    "```bash",
    code.speech.cURL,
    "```",
    "",
    "## Models",
    "",
    ...(MODELS as readonly Model[]).map(m => `- ${m.name} (${TASK[m.task]}): POST ${m.endpoint}. Languages: ${m.languages.map(l => `${language(l).name.en} (${l})`).join(", ")}${m.pairs ? `. Directions: ${m.pairs.map(([a, b]) => `${a}→${b}`).join(", ")}` : ""}. Status: ${m.status}.`),
    "",
    "## Languages",
    "",
    ...LANGUAGES.map(l => { const t = tasksOf(l.code); return `- ${l.name.en} (${l.code}): ${t.length ? t.map(x => TASK[x]).join(", ") : "coming"}`; }),
    "",
    "## Voices",
    "",
    ...VOICES.map(v => `- ${v.id}: ${v.languages.map(l => language(l).name.en).join(", ")}${"gender" in v && v.gender ? `, ${v.gender}` : ""}`),
    "",
    "## Endpoints",
    "",
    ...d.endpoints.flatMap(e => [
      `### ${e.title}: ${e.method} ${e.path}`,
      "",
      e.body,
      "",
      ...e.params.map(([p, v]) => `- \`${p}\`: ${v}`),
      "",
      `Returns: ${e.returns}`,
      "",
      "```bash",
      code[e.id].cURL,
      "```",
      "",
      ...(e.id === "translate" ? ["Text:", "", "```bash", code.translateText.cURL, "```", ""] : []),
    ]),
    "## Errors",
    "",
    d.errorsSub,
    "",
    ...d.errors.map(([s, types, why]) => `- ${s} ${types}: ${why}`),
    "",
    "## Limits",
    "",
    ...d.limits.map(([a, b]) => `- ${a}: ${b}`),
    `- Text per speech request: ${LIMITS.textChars} characters`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
