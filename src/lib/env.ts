import "server-only";

/* Which parts of the developer platform are configured. The site builds and serves its public pages
   without any of these; account pages and the live demos say so instead of failing. */

/** Accounts need the Neon database and Neon Auth (its URL and the secret that signs this site's cookies). Server-only. */
export const hasAccounts = () => Boolean(process.env.DATABASE_URL && process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);

export type Provider = "google" | "github";

/** The social sign-in buttons to show: NEON_AUTH_PROVIDERS ("google,github" when unset), which should match the
 *  providers switched on in the Neon Console. Server-only. */
export const providers = (): Provider[] =>
  [...new Set((process.env.NEON_AUTH_PROVIDERS ?? "google,github").split(",").map(p => p.trim().toLowerCase()))]
    .filter((p): p is Provider => p === "google" || p === "github");
