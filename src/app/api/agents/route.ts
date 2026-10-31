import { NextResponse } from "next/server";
import { agentRoute } from "@/lib/agents-http";
import { createAgent, listAgents } from "@/lib/agents";
import { isLang } from "@/i18n/config";
import { template } from "@/content/agent-templates";

/* GET the user's agents; POST { template?, name?, lang? } makes one, from a template or blank. */
export const dynamic = "force-dynamic";

export const GET = agentRoute(false, async (_req, user) => NextResponse.json({ agents: await listAgents(user.id) }, { headers: { "Cache-Control": "no-store" } }));

export const POST = agentRoute(true, async (req, user) => {
  const j = await req.json().catch(() => ({})) as { template?: unknown; name?: unknown; lang?: unknown };
  const t = template(typeof j.template === "string" ? j.template : null);
  const lang = typeof j.lang === "string" && isLang(j.lang) ? j.lang : "en";
  const name = typeof j.name === "string" && j.name.trim() ? j.name.trim() : t ? t.name[lang] : lang === "fr" ? "Nouvel agent" : "New agent";
  const agent = await createAgent(user.id, {
    name, template: t?.id ?? null, greeting: t?.greeting ?? "", instructions: t?.instructions ?? "", voice: null,
    languages: t?.languages ?? ["ha"], checks: t?.checks ?? [], tests: t?.tests,
  });
  return NextResponse.json({ agent }, { status: 201 });
});
