import { NextResponse } from "next/server";
import { agentRoute, notFound } from "@/lib/agents-http";
import { deleteTest } from "@/lib/agents";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ test: string }> };

export const DELETE = agentRoute<Ctx>(true, async (_req, user, { params }) =>
  (await deleteTest(user.id, (await params).test)) ? new NextResponse(null, { status: 204 }) : notFound());
