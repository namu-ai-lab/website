import "server-only";
import { redirect } from "next/navigation";
import { lp, type Lang } from "@/i18n/config";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";

/** A profile as the database driver returns it: pg reads timestamptz as Date. */
export type Profile = {
  user_id: string; email: string | null; name: string | null; beta_status: "pending" | "approved" | "denied"; role: "user" | "admin";
  use_case: string | null; monthly_audio_seconds: number; created_at: Date;
};
/** A profile as the browser holds it (the admin page and /api/admin/beta): its date as an ISO string. */
export type ProfileRow = Omit<Profile, "created_at"> & { created_at: string };
export const profileRow = (p: Profile): ProfileRow => ({ ...p, created_at: p.created_at.toISOString() });

/* Users live in Neon Auth's own schema (neon_auth."user", uuid ids); profiles keep the id as text. */
const PROFILE = `select p.user_id, u.email, u.name, p.beta_status, p.role, p.use_case, p.monthly_audio_seconds, p.created_at
  from public.profiles p join neon_auth."user" u on u.id::text = p.user_id`;

/** A user's profile, created on their first visit as active: anyone who signs up can create keys at once.
    An existing profile is never changed here, so a paused account stays paused. */
export async function profileOf(userId: string): Promise<Profile> {
  await sql("insert into public.profiles (user_id, beta_status) values ($1, 'approved') on conflict (user_id) do nothing", [userId]);
  const [p] = await sql<Profile>(`${PROFILE} where p.user_id = $1`, [userId]);
  return p;
}

export const allProfiles = () => sql<Profile>(`${PROFILE} order by p.created_at desc limit 500`);

/** Where to go after signing in: a path on this site only, never another origin; the console by default. */
export const nextPath = (lang: Lang, raw?: string) => (raw && /^\/(?!\/)[\w\-/]*$/.test(raw) ? raw : lp(lang, "/account"));

/* Every account page starts here: a verified user and their profile, or a trip to the sign-in page. */
export async function requireAccount(lang: Lang, path: string) {
  const user = await currentUser();
  if (!user) redirect(`${lp(lang, "/login")}?next=${encodeURIComponent(lp(lang, path))}`);
  return { user, profile: await profileOf(user.id) };
}
