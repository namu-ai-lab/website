import { NotConfigured } from "@/components/account/AccountShell";
import { ConversationList } from "@/components/agents/AgentBuilder";
import { ConversationView } from "@/components/agents/ConversationView";
import { NotReady } from "@/components/agents/NotReady";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { platformMetadata } from "@/components/platform/meta";
import { agentsCopy } from "@/content/agents";
import { lp, type Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { conversationOf, conversationsOf, getAgent } from "@/lib/agents";
import type { Conversation } from "@/lib/agent-shape";
import type { LangCode } from "@/lib/catalog";
import { isMissingTable } from "@/lib/db";
import { hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "agents", t => t.nav.conversations);

/* Every agent's conversations, newest first; ?c=<id> opens one turn by turn; ?flagged=1 keeps the flagged ones. */
export default async function Conversations({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ c?: string; flagged?: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/agents/conversations");
  const t = agentsCopy[lang], q = await searchParams, L = (p: string) => lp(lang, p);
  const shell = { lang, door: "agents" as const, page: "conversations", admin: profile.role === "admin", user, access: profile.beta_status };
  let list: Conversation[], open: Conversation | null = null, speaking: LangCode = "ha";
  try {
    list = await conversationsOf(user.id, { limit: 200 });
    if (q.c) {
      open = await conversationOf(user.id, q.c);
      const a = open ? await getAgent(user.id, open.agent_id) : null;
      speaking = a?.languages[0] ?? speaking;
    }
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    return <PlatformShell {...shell} layout="center"><NotReady lang={lang} /></PlatformShell>;
  }
  if (q.flagged === "1") list = list.filter(c => c.flagged);
  if (open) return (
    <PlatformShell {...shell}>
      <a className="ag-back" href={L("/agents/conversations")}>{t.convs.back}</a>
      <ConversationView c={open} lang={lang} speaking={speaking} />
    </PlatformShell>
  );
  return (
    <PlatformShell {...shell} title={t.convs.title}>
      <div className="pf-chips ag-conv-filter">
        <a className="pf-chip" aria-current={q.flagged !== "1" ? "page" : undefined} href={L("/agents/conversations")}>{t.convs.all}</a>
        <a className="pf-chip" aria-current={q.flagged === "1" ? "page" : undefined} href={`${L("/agents/conversations")}?flagged=1`}>{t.convs.flagged}</a>
      </div>
      <ConversationList list={list} lang={lang} />
    </PlatformShell>
  );
}
