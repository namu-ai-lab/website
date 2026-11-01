import { NotConfigured } from "@/components/account/AccountShell";
import { NotReady } from "@/components/agents/NotReady";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { platformMetadata } from "@/components/platform/meta";
import { agentsCopy } from "@/content/agents";
import { lp, type Lang } from "@/i18n/config";
import { formatDate, formatNumber } from "@/i18n/format";
import { requireAccount } from "@/lib/account";
import { docsOf, type DocRow } from "@/lib/agents";
import { isMissingTable } from "@/lib/db";
import { hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "agents", t => t.nav.knowledge);

/* Every document every agent answers from; each opens its agent's Knowledge tab. */
export default async function Knowledge({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/agents/knowledge");
  const t = agentsCopy[lang], L = (p: string) => lp(lang, p);
  const shell = { lang, door: "agents" as const, page: "knowledge", admin: profile.role === "admin", user, access: profile.beta_status };
  let docs: DocRow[];
  try { docs = await docsOf(user.id); } catch (e) {
    if (!isMissingTable(e)) throw e;
    return <PlatformShell {...shell} layout="center"><NotReady lang={lang} /></PlatformShell>;
  }
  return (
    <PlatformShell {...shell} title={t.docsPage.title}>
      {docs.length === 0 ? <div className="pf-empty"><p>{t.docsPage.emptyH}</p></div> : (
        <div className="cx-table-wrap">
          <table className="cx-table">
            <thead><tr><th>{t.docsPage.th.name}</th><th>{t.docsPage.th.agent}</th><th className="num">{t.docsPage.th.size}</th><th className="num">{t.docsPage.th.added}</th></tr></thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id}>
                  <td><a className="ag-cell-link" href={`${L(`/agents/${d.agent_id}`)}?tab=knowledge`}>{d.name}</a></td>
                  <td>{d.agent_name}</td>
                  <td className="num">{t.knowledge.chars(formatNumber(lang, d.chars))}</td>
                  <td className="num">{formatDate(lang, d.created_at, { style: "dayMonth" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PlatformShell>
  );
}
