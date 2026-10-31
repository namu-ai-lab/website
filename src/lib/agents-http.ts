import "server-only";
import type { NextRequest } from "next/server";
import { isMissingTable } from "@/lib/db";
import { GatewayError } from "@/lib/gateway";
import { fail, signedIn } from "@/lib/http";

/* The shared frame of Namu Agents' routes: the signed-in user (writes from this site only), and one answer for the
   failures every route can meet: tables not set up yet (503 not_ready), a model that could not answer (the
   gateway's own status and type), a limit reached (409). Route handlers stay a few lines each. */
type User = { id: string };
export function agentRoute<C>(write: boolean, handle: (req: NextRequest, user: User, ctx: C) => Promise<Response>) {
  return async (req: NextRequest, ctx: C) => {
    const s = await signedIn(req, write);
    if (s.e) return s.e;
    try {
      return await handle(req, s.user, ctx);
    } catch (e) {
      if (isMissingTable(e)) return fail(503, "not_ready", "Agents are being set up.");
      if (e instanceof GatewayError) return fail(e.status, e.type, e.message);
      if (e instanceof RangeError) return fail(409, "limit_reached", "This agent has as many as it can hold.");
      throw e;
    }
  };
}

export const notFound = () => fail(404, "not_found", "No such agent.");
