import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { db } from "./db";

/* Sign-in for the developer dashboard (Better Auth, sessions stored in Neon). Providers switch on when their
   OAuth credentials are set: GitHub (GITHUB_CLIENT_ID/SECRET) and Google (GOOGLE_CLIENT_ID/SECRET).
   Each provider's callback URL is <site>/api/auth/callback/<provider>. Server-only. */
let instance: ReturnType<typeof create> | null = null;

/** The site's own address: BETTER_AUTH_URL if set; otherwise, on Vercel, the branch URL for a preview
    (so each PR signs in on its own preview) and the production URL in production. */
function siteURL(): string | undefined {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  const host = process.env.VERCEL_ENV === "preview" ? process.env.VERCEL_BRANCH_URL : process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? `https://${host}` : undefined;
}

function create() {
  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
    socialProviders.github = { clientId: process.env.GITHUB_CLIENT_ID, clientSecret: process.env.GITHUB_CLIENT_SECRET };
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    socialProviders.google = { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET };
  return betterAuth({
    database: db(),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: siteURL(),
    socialProviders,
    session: { expiresIn: 60 * 60 * 24 * 14, updateAge: 60 * 60 * 24 },   // two weeks, renewed daily
    plugins: [nextCookies()],
  });
}

/** Created on first use, so builds without DATABASE_URL never touch it. */
export const auth = () => (instance ??= create());

/** The signed-in user, verified against the session table, or null. */
export async function currentUser() {
  const s = await auth().api.getSession({ headers: await headers() });
  return s?.user ?? null;
}
