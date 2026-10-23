import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { required } from "@/lib/env";

/* Sign-in for the developer console: Neon Auth, the managed Better Auth that lives beside the database. Users and
   sessions are kept by Neon in the neon_auth schema; the browser talks to it through this site's /api/auth/*, and the
   session rides in this site's own signed, httpOnly cookies. The methods (email and password with a 6-digit code to
   verify the address, Google, GitHub) and the trusted domains are switched on in the Neon Console, under Auth.
   Server-only. */
let instance: ReturnType<typeof create> | null = null;

function create() {
  return createNeonAuth({
    baseUrl: required("NEON_AUTH_BASE_URL"),
    cookies: { secret: required("NEON_AUTH_COOKIE_SECRET") },    // 32 characters or more
  });
}

/** Created on first use, so builds and public pages never need the auth settings. */
export const auth = () => (instance ??= create());

/** The signed-in user, checked with Neon Auth (cached in a signed cookie for five minutes), or null. */
export async function currentUser() {
  const { data } = await auth().getSession();
  return data?.user ?? null;
}
