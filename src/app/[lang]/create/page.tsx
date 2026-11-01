import { NotConfigured } from "@/components/account/AccountShell";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { platformMetadata } from "@/components/platform/meta";
import { CreateHome } from "@/components/projects/CreateHome";
import type { Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { isMissingTable } from "@/lib/db";
import { hasAccounts } from "@/lib/env";
import type { ProjectSummary } from "@/lib/project-shape";
import { listProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "create", t => t.nav.home);

/* Namu Create's home: one question and one box, the tools, and the latest projects. */
export default async function CreateHomePage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/create");
  let recents: ProjectSummary[] = [], ready = true;
  try { recents = await listProjects(user.id, 6); } catch (e) { if (!isMissingTable(e)) throw e; ready = false; }
  return (
    <PlatformShell lang={lang} door="create" page="home" admin={profile.role === "admin"} user={user} access={profile.beta_status} layout="center">
      <CreateHome lang={lang} recents={recents} ready={ready} />
    </PlatformShell>
  );
}
