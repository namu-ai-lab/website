/* Which parts of the developer platform are configured. The site builds and serves its public pages
   without any of these; account pages and the live demos say so instead of failing. */

/** Accounts need the Neon database and the session secret. Server-only. */
export const hasAccounts = () => Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);

/** Sign-in providers switched on by their credentials being present. Server-only. */
export const providers = () => ([
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? "github" : null,
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "google" : null,
] as const).filter((p): p is "github" | "google" => p !== null);

/** The public API base developers call: the gateway on Namu's own Modal workspace (namu-ai-lab), until
 *  api.namu-ai.org points at it. NEXT_PUBLIC_NAMU_API_BASE overrides it. */
export const apiBase = (process.env.NEXT_PUBLIC_NAMU_API_BASE || "https://namu-ai-lab--namu-gateway-api.modal.run").replace(/\/+$/, "");
