import { NotConfigured } from "@/components/account/AccountShell";
import { Icon } from "@/components/Icon";
import { LocalTime } from "@/components/console/LocalTime";
import { NotReady } from "@/components/agents/NotReady";
import { TemplateGallery } from "@/components/agents/TemplateGallery";
import { BlankAgentButton, VoiceDot } from "@/components/agents/bits";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { platformMetadata } from "@/components/platform/meta";
import { agentsCopy } from "@/content/agents";
import { lp, type Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { listAgents, type AgentSummary } from "@/lib/agents";
import { voiceFor } from "@/lib/agent-turn";
import { language, voice } from "@/lib/catalog";
import { isMissingTable } from "@/lib/db";
import { hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "agents", t => t.nav.agents);

/* Namu Agents' home: the user's agents as rows (their voice, whether they are on WhatsApp, when they last changed),
   or a calm first step; then three templates to start from. */
export default async function Agents({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/agents");
  const t = agentsCopy[lang], L = (p: string) => lp(lang, p);
  let agents: AgentSummary[] | null = null;
  try { agents = await listAgents(user.id); } catch (e) { if (!isMissingTable(e)) throw e; }
  const shell = { lang, door: "agents" as const, page: "agents", admin: profile.role === "admin", user, access: profile.beta_status };
  if (agents === null) return <PlatformShell {...shell} layout="center"><NotReady lang={lang} /></PlatformShell>;

  return (
    <PlatformShell {...shell} title={t.list.title} actions={<BlankAgentButton lang={lang} label={t.list.create} busyLabel={t.list.creating} className="cx-btn primary" icon />}>
      {agents.length ? (
        <ul className="ag-rows">
          {agents.map(a => {
            const v = voiceFor(a), bound = Boolean(a.channels.whatsapp?.phoneNumberId);
            return (
              <li key={a.id}>
                <a className="ag-row ag-agent-row" href={L(`/agents/${a.id}`)}>
                  <VoiceDot id={v} name={v ? voice(v).name : a.name} size={40} />
                  <span className="ag-row-main"><strong>{a.name}</strong><em>{language(a.languages[0] ?? "ha").endonym}{v ? ` · ${voice(v).name}` : ""}</em></span>
                  <span className="hide-sm"><span className={`ag-tag${bound ? " live" : ""}`}>{bound ? t.list.live : t.list.draft}</span></span>
                  <span className="ag-row-meta hide-sm"><LocalTime iso={a.updated_at} lang={lang} style="dayMonth" rel /></span>
                  <Icon name="chevron" size={16} stroke={1.6} className="ag-go" />
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="ag-card ag-empty ag-first">
          <span className="ag-first-orb" aria-hidden="true" />
          <h2>{t.list.emptyH}</h2>
        </div>
      )}
      <section className="ag-section">
        <div className="ag-section-head"><h2>{t.list.fromTemplate}</h2><a className="ag-see" href={L("/agents/templates")}>{t.list.seeAll}</a></div>
        <TemplateGallery lang={lang} limit={3} />
      </section>
    </PlatformShell>
  );
}
