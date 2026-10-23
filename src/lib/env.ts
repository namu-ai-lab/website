import "server-only";
import type { ServerSetting } from "./env-check";

/* The server's settings: every secret and switch the site reads is read here, by a name lib/env-check lists and
   checks when Next starts. The site builds and serves its public pages without any of them; account pages and the
   live demos say so instead of failing. Browser-safe settings live in lib/public-config. */

/** A setting's value, or undefined when it is unset or empty. Read at call time, never cached. */
export const setting = (name: ServerSetting): string | undefined => process.env[name] || undefined;

/** A setting the caller cannot work without: its value, or an error that names it. */
export function required(name: ServerSetting): string {
  const value = setting(name);
  if (!value) throw new Error(`${name} is not set (see .env.example)`);
  return value;
}

/** Accounts need the Neon database and Neon Auth (its URL and the secret that signs this site's cookies). */
export const hasAccounts = () => Boolean(setting("DATABASE_URL") && setting("NEON_AUTH_BASE_URL") && setting("NEON_AUTH_COOKIE_SECRET"));

export type Provider = "google" | "github";

/** The social sign-in buttons to show: NEON_AUTH_PROVIDERS ("google,github" when unset), which should match the
 *  providers switched on in the Neon Console. Set and empty means none, so this reads the raw value. */
export const providers = (): Provider[] =>
  [...new Set((process.env.NEON_AUTH_PROVIDERS ?? "google,github").split(",").map(p => p.trim().toLowerCase()))]
    .filter((p): p is Provider => p === "google" || p === "github");
