/* Which parts of the developer platform are configured. The site builds and serves its public pages
   without any of these; account pages and the live demos say so instead of failing. */

/** Accounts need the Neon database and the session secret. Server-only. */
export const hasAccounts = () => Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);

/** Sign-in providers switched on by their credentials being present. Server-only. */
export const providers = () => ([
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? "github" : null,
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "google" : null,
] as const).filter((p): p is "github" | "google" => p !== null);

/** The public API base developers call: set NEXT_PUBLIC_NAMU_API_BASE to the gateway on Namu's own Modal
 *  workspace. The fallback is the address the API will keep once its domain points at the gateway. */
export const apiBase = (process.env.NEXT_PUBLIC_NAMU_API_BASE || "https://api.namu-ai.org").replace(/\/+$/, "");
