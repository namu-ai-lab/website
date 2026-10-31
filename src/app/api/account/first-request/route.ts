import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { signedIn } from "@/lib/http";
import { latestApiRequest } from "@/lib/usage";

/* GET: the signed-in account's latest request through its own keys, or null. The API door's first visit polls it,
   as ElevenAPI's "Listening for your first request" does. */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const s = await signedIn(req, false);
  if (s.e) return s.e;
  return NextResponse.json({ request: await latestApiRequest(s.user.id) }, { headers: { "Cache-Control": "no-store" } });
}
