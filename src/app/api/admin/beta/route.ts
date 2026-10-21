import { NextResponse, type NextRequest } from "next/server";
import { profileOf, type Profile } from "@/lib/account";
import { sql } from "@/lib/db";
import { fail, signedIn } from "@/lib/http";

/* Accounts: an admin pauses ('denied') or resumes ('approved') an account, and can change its monthly audio allowance.
   The admin check reads the caller's own profile on the server, so it cannot be spoofed from the browser. */
export async function POST(req: NextRequest) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  if ((await profileOf(s.user.id)).role !== "admin") return fail(403, "not_admin", "Admins only.");

  const body = await req.json().catch(() => null) as { user_id?: unknown; status?: unknown; minutes?: unknown } | null;
  const target = typeof body?.user_id === "string" && body.user_id.length <= 64 ? body.user_id : null;
  const status = body?.status === "approved" || body?.status === "denied" ? body.status : null;
  if (!target || !status) return fail(400, "bad_request", "user_id and status (approved|denied) are required.");
  if (target === s.user.id && status === "denied") return fail(400, "self", "You cannot pause your own account.");
  const minutes = typeof body?.minutes === "number" && Number.isFinite(body.minutes) && body.minutes >= 0 && body.minutes <= 100000
    ? Math.round(body.minutes * 60) : null;

  const rows = await sql<Pick<Profile, "user_id">>(
    `update public.profiles set beta_status = $1, reviewed_at = now(), monthly_audio_seconds = coalesce($2, monthly_audio_seconds)
     where user_id = $3 returning user_id`, [status, minutes, target]);
  if (!rows.length) return fail(404, "not_found", "Unknown account.");
  return NextResponse.json({ data: await profileOf(target) });
}
