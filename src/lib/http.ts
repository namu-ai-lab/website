import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";
import { hasAccounts } from "@/lib/env";
import { visitorBucket } from "@/lib/ip";

/* Shared bits for the site's route handlers. Errors use the gateway's shape: { error: { type, message } }. */
export const fail = (status: number, type: string, message: string, headers?: HeadersInit) =>
  NextResponse.json({ error: { type, message } }, { status, headers: { "Cache-Control": "no-store", ...headers } });

/** Requests that change state must come from this site's own pages (defence in depth over SameSite cookies). */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).host === req.headers.get("host"); } catch { return false; }
}

/** The visitor's IP as seen by the hosting edge (Vercel sets x-forwarded-for; the first entry is the client). */
export const clientIp = (req: NextRequest) =>
  req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

/** Who the demo's per-visitor limit counts, sent to the gateway as X-Namu-Client-IP: the IPv4 address, or the IPv6 /64
    (lib/ip). The gateway narrows a raw address the same way; sending the /64 also keeps the full address out of it. */
export const demoVisitor = (req: NextRequest) => visitorBucket(clientIp(req));

/** The signed-in user for a route handler, or the error response to return. */
export async function signedIn(req: NextRequest, write: boolean) {
  if (!hasAccounts()) return { e: fail(503, "not_configured", "Accounts are not configured.") } as const;
  if (write && !sameOrigin(req)) return { e: fail(403, "bad_origin", "Cross-site request refused.") } as const;
  const user = await currentUser();
  if (!user) return { e: fail(401, "signed_out", "Sign in first.") } as const;
  return { e: null, user } as const;
}
