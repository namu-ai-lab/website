import { NotConfigured } from "@/components/account/AccountShell";
import { TemplateGallery } from "@/components/agents/TemplateGallery";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { platformMetadata } from "@/components/platform/meta";
import { agentsCopy } from "@/content/agents";
import type { Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "agents", t => t.nav.templates);

export default async function Templates({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/agents/templates");
  const t = agentsCopy[lang];
  return (
    <PlatformShell lang={lang} door="agents" page="templates" admin={profile.role === "admin"} user={user} access={profile.beta_status} layout="full">
      <div className="ag-page"><h1 className="ag-h1">{t.templates.title}</h1><TemplateGallery lang={lang} /></div>
    </PlatformShell>
  );
}
