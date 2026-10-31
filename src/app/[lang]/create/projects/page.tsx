import { NotConfigured } from "@/components/account/AccountShell";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { platformMetadata } from "@/components/platform/meta";
import { NotReady } from "@/components/projects/NotReady";
import { NewProjectButton, ProjectList } from "@/components/projects/ProjectList";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { isMissingTable } from "@/lib/db";
import { hasAccounts } from "@/lib/env";
import type { ProjectSummary } from "@/lib/project-shape";
import { listProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "create", t => t.nav.projects);

export default async function Projects({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/create/projects");
  let projects: ProjectSummary[] | null = null;
  try { projects = await listProjects(user.id); } catch (e) { if (!isMissingTable(e)) throw e; }
  return (
    <PlatformShell lang={lang} door="create" page="projects" admin={profile.role === "admin"} user={user} access={profile.beta_status} title={platformCopy[lang].nav.projects}
      actions={projects?.length ? <NewProjectButton lang={lang} /> : undefined}>
      {projects ? <ProjectList lang={lang} projects={projects} /> : <NotReady lang={lang} />}
    </PlatformShell>
  );
}
