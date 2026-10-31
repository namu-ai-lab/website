import { NextResponse } from "next/server";
import { agentRoute, notFound } from "@/lib/agents-http";
import { deleteDoc } from "@/lib/agents";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ doc: string }> };

export const DELETE = agentRoute<Ctx>(true, async (_req, user, { params }) =>
  (await deleteDoc(user.id, (await params).doc)) ? new NextResponse(null, { status: 204 }) : notFound());
