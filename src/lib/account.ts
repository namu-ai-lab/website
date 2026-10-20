import { redirect } from "next/navigation";
import { lp, type Lang } from "@/i18n/config";
import { currentUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export type Profile = {
  user_id: string; email: string | null; name: string | null; beta_status: "pending" | "approved" | "denied"; role: "user" | "admin";
  use_case: string | null; monthly_audio_seconds: number; created_at: string;
};

const PROFILE = `select p.user_id, u.email, u.name, p.beta_status, p.role, p.use_case, p.monthly_audio_seconds, p.created_at
  from public.profiles p join public."user" u on u.id = p.user_id`;

/** A user's profile, created as pending if the sign-up trigger has not run (e.g. users from before the migration). */
export async function profileOf(userId: string): Promise<Profile> {
  await sql("insert into public.profiles (user_id) values ($1) on conflict (user_id) do nothing", [userId]);
  const [p] = await sql<Profile>(`${PROFILE} where p.user_id = $1`, [userId]);
  return p;
}

export const allProfiles = () => sql<Profile>(`${PROFILE} order by p.created_at desc limit 500`);

/* Every account page starts here: a verified user and their profile, or a trip to the sign-in page. */
export async function requireAccount(lang: Lang, path: string) {
  const user = await currentUser();
  if (!user) redirect(`${lp(lang, "/login")}?next=${encodeURIComponent(lp(lang, path))}`);
  return { user, profile: await profileOf(user.id) };
}
