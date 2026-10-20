import { NextResponse, type NextRequest } from "next/server";
import { profileOf } from "@/lib/account";
import { sql } from "@/lib/db";
import { fail, signedIn } from "@/lib/http";

/* A pending developer tells us what they are building. That is the only field a user can change. */
export async function POST(req: NextRequest) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const body = await req.json().catch(() => null) as { use_case?: unknown } | null;
  const useCase = typeof body?.use_case === "string" ? body.use_case.trim().slice(0, 1000) : "";
  if (!useCase) return fail(400, "missing_use_case", "Tell us a little about your project.");
  await profileOf(s.user.id);
  await sql("update public.profiles set use_case = $1 where user_id = $2", [useCase, s.user.id]);
  return NextResponse.json({ ok: true });
}
