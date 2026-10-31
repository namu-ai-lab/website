import { NotConfigured } from "@/components/account/AccountShell";
import { Icon } from "@/components/Icon";
import { NotReady } from "@/components/agents/NotReady";
import { BlankAgentButton } from "@/components/agents/bits";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { VoiceAvatar } from "@/components/platform/pickers";
import { platformMetadata } from "@/components/platform/meta";
import { template } from "@/content/agent-templates";
import { agentsCopy } from "@/content/agents";
import { lp, type Lang } from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { requireAccount } from "@/lib/account";
import { listAgents, type AgentSummary } from "@/lib/agents";
import { voiceFor } from "@/lib/agent-turn";
import { language, voice } from "@/lib/catalog";
import { isMissingTable } from "@/lib/db";
import { hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "agents", t => t.nav.agents);

/* Namu Agents' home: the user's agents, or, before the first, one centred way in (templates, or a blank agent). */
export default async function Agents({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/agents");
  const t = agentsCopy[lang], L = (p: string) => lp(lang, p);
  let agents: AgentSummary[] | null = null;
  try { agents = await listAgents(user.id); } catch (e) { if (!isMissingTable(e)) throw e; }
  const shell = { lang, door: "agents" as const, page: "agents", admin: profile.role === "admin", user, access: profile.beta_status };

  if (agents === null) return <PlatformShell {...shell} layout="center"><NotReady lang={lang} /></PlatformShell>;
  if (!agents.length) return (
    <PlatformShell {...shell} layout="center">
      <div className="pf-hero ag-first">
        <span className="ag-orb still" aria-hidden="true"><Icon name="phone-voice" size={30} stroke={1.3} /></span>
        <h1>{t.list.emptyH}</h1>
        <div className="ag-first-acts">
          <a className="cx-btn primary" href={L("/agents/templates")}>{t.list.browse}</a>
          <BlankAgentButton lang={lang} label={t.list.blank} busyLabel={t.templates.using} />
        </div>
      </div>
    </PlatformShell>
  );
  return (
    <PlatformShell {...shell} title={t.list.title} actions={<a className="cx-btn primary" href={L("/agents/templates")}><Icon name="plus" size={15} stroke={1.7} />{t.list.create}</a>}>
      <ul className="ag-agents">
        {agents.map(a => {
          const v = voiceFor(a);
          return (
            <li key={a.id}>
              <a className="ag-acard" href={L(`/agents/${a.id}`)}>
                <span className="ag-acard-top">{v ? <VoiceAvatar v={{ id: v }} size={40} /> : <span className="ag-orb mini" aria-hidden="true" />}
                  <span className="ag-when">{formatDate(lang, a.updated_at, { style: "dayMonth" })}</span></span>
                <strong>{a.name}</strong>
                <span className="ag-acard-meta">{template(a.template) && template(a.template)!.name[lang] !== a.name ? template(a.template)!.name[lang] : ""}</span>
                <span className="ag-tags">{a.languages.map(l => <em key={l}>{language(l).endonym}</em>)}{v && <em>{voice(v).name}</em>}</span>
                <span className="ag-acard-foot">{t.list.docs(a.docs)} · {t.list.convs(a.conversations)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </PlatformShell>
  );
}
