import { NextResponse } from "next/server";
import { agentRoute, notFound } from "@/lib/agents-http";
import { setFlag } from "@/lib/agents";

/* PATCH { flagged }: marks a conversation for a person to look at (a native reviewer, or a new test). */
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ c: string }> };

export const PATCH = agentRoute<Ctx>(true, async (req, user, { params }) => {
  const j = await req.json().catch(() => null) as { flagged?: unknown } | null;
  return (await setFlag(user.id, (await params).c, j?.flagged === true)) ? NextResponse.json({ flagged: j?.flagged === true }) : notFound();
});
