/* The site's server settings, by name, and the one check of them. The site builds and serves its public pages with
   none of them set; each feature switches on when its settings are there, and its pages say so when they are not:
     accounts      DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET, NAMU_KEY_PEPPER (NEON_AUTH_PROVIDERS)
     live demos    NAMU_DEMO_KEY (the conversation also uses NAMU_AGENT_URL, MODAL_PROXY_KEY, MODAL_PROXY_SECRET)
     Playground    NAMU_SERVICE_KEY
   What is wrong is a feature that is set up in part: accounts with no pepper, half a proxy token. next.config.ts runs
   checkServerEnv() whenever Next starts. A production build or server stops, so a broken configuration never
   replaces a working deployment; the dev server prints what is on and what to fix.
   This file reads no values itself (it is given process.env), so next.config.ts can import it; the server reads
   settings through lib/env. .env.example documents every name. */

export const SERVER_SETTINGS = [
  "DATABASE_URL", "NEON_AUTH_BASE_URL", "NEON_AUTH_COOKIE_SECRET", "NEON_AUTH_PROVIDERS", "NAMU_KEY_PEPPER",
  "NAMU_DEMO_KEY", "NAMU_SERVICE_KEY", "NAMU_AGENT_URL", "MODAL_PROXY_KEY", "MODAL_PROXY_SECRET",
] as const;
export type ServerSetting = (typeof SERVER_SETTINGS)[number];

type Env = Partial<Record<string, string>>;

const ACCOUNTS = ["DATABASE_URL", "NEON_AUTH_BASE_URL", "NEON_AUTH_COOKIE_SECRET"] as const;

const isUrl = (s: string) => { try { return Boolean(new URL(s)); } catch { return false; } };

/** Each setting that is there in part or malformed, as a sentence that says what to fix. Empty means usable. */
export function envProblems(env: Env): string[] {
  const has = (name: ServerSetting) => Boolean(env[name]);
  const problems: string[] = [];

  const missing = ACCOUNTS.filter(name => !has(name));
  if (missing.length > 0 && missing.length < ACCOUNTS.length)
    problems.push(`Accounts are half configured: set ${missing.join(" and ")} too, or leave all of ${ACCOUNTS.join(", ")} unset.`);
  if (missing.length === 0) {
    if (!isUrl(env.NEON_AUTH_BASE_URL ?? "")) problems.push("NEON_AUTH_BASE_URL is not a URL.");
    if ((env.NEON_AUTH_COOKIE_SECRET ?? "").length < 32) problems.push("NEON_AUTH_COOKIE_SECRET must be 32 characters or more.");
    if ((env.NAMU_KEY_PEPPER ?? "").length < 32) problems.push("NAMU_KEY_PEPPER must be set, 32 characters or more: with accounts on, no API key can be created without it.");
  }
  if (has("MODAL_PROXY_KEY") !== has("MODAL_PROXY_SECRET")) problems.push("MODAL_PROXY_KEY and MODAL_PROXY_SECRET are a pair: set both or neither.");
  if (has("NAMU_AGENT_URL") && !isUrl(env.NAMU_AGENT_URL ?? "")) problems.push("NAMU_AGENT_URL is not a URL.");
  return problems;
}

/** Which features are on, for the dev server's start-up line. */
export function envSummary(env: Env): string {
  const on = (names: readonly ServerSetting[]) => names.every(name => Boolean(env[name]));
  const feature = (label: string, names: readonly ServerSetting[]) =>
    on(names) ? `${label} on` : `${label} off (${names.filter(name => !env[name]).join(", ")})`;
  return [feature("accounts", ACCOUNTS), feature("live demos", ["NAMU_DEMO_KEY"]), feature("Playground", ["NAMU_SERVICE_KEY"])].join(" · ");
}

/** Stops with every problem listed when `strict` (a production build or server), and only reports them otherwise. */
export function checkServerEnv(env: Env, { strict }: { strict: boolean }): void {
  const problems = envProblems(env);
  if (strict && problems.length) throw new Error(`Server settings need fixing (see .env.example):\n  - ${problems.join("\n  - ")}`);
  if (strict) return;
  console.log(`Server settings: ${envSummary(env)}`);
  for (const p of problems) console.warn(`Server settings: ${p}`);
}
