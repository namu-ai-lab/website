import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NotConfigured } from "@/components/account/AccountShell";
import { AgentBuilder } from "@/components/agents/AgentBuilder";
import { TABS, type Tab } from "@/components/agents/tabs";
import { NotReady } from "@/components/agents/NotReady";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { BLANK_STEPS, template } from "@/content/agent-templates";
import { agentsCopy } from "@/content/agents";
import { platformCopy } from "@/content/platform";
import { isLang, type Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { conversationsOf, docsOf, getAgent, testsOf } from "@/lib/agents";
import { isMissingTable } from "@/lib/db";
import { hasAccounts } from "@/lib/env";
import { hasWhatsapp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  return { title: `${agentsCopy[l].list.title} · Namu ${platformCopy[l].doors.agents}`, robots: { index: false } };
}

/* The builder of one agent (?tab= opens a tab). The webhook URL shown on Deploy is this site's own address. */
export default async function Builder({ params, searchParams }: { params: Promise<{ lang: string; id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { lang: raw, id } = await params, lang = raw as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, `/agents/${id}`);
  const shell = { lang, door: "agents" as const, page: "agents", admin: profile.role === "admin", user, access: profile.beta_status };
  let data;
  try {
    const agent = await getAgent(user.id, id);
    if (!agent) notFound();
    const [docs, tests, conversations] = await Promise.all([docsOf(user.id, id), testsOf(user.id, id), conversationsOf(user.id, { agentId: id, limit: 50 })]);
    data = { agent, docs, tests, conversations };
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    return <PlatformShell {...shell} layout="center"><NotReady lang={lang} /></PlatformShell>;
  }
  const asked = (await searchParams).tab;
  const tab: Tab = TABS.find(x => x === asked) ?? "agent";
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "www.namuai-lab.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return (
    <PlatformShell {...shell} layout="full">
      <AgentBuilder lang={lang} initial={data.agent} docs={data.docs} tests={data.tests} conversations={data.conversations}
        steps={template(data.agent.template)?.steps ?? BLANK_STEPS} tab={tab} whatsapp={{ server: hasWhatsapp(), webhook: `${proto}://${host}/api/agents/whatsapp`, admin: shell.admin }} />
    </PlatformShell>
  );
}
