import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotConfigured } from "@/components/account/AccountShell";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { NotReady } from "@/components/projects/NotReady";
import { ProjectEditor } from "@/components/projects/ProjectEditor";
import { platformCopy } from "@/content/platform";
import { isLang, type Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { isMissingTable } from "@/lib/db";
import { hasAccounts } from "@/lib/env";
import { isUuid, type Project } from "@/lib/project-shape";
import { getProject } from "@/lib/projects";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  return { title: `${platformCopy[l].nav.projects} · Namu Create`, robots: { index: false } };
}

/* One project in the editor: the source and a column per local language. */
export default async function ProjectPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang: raw, id } = await params;
  const lang = raw as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, `/create/projects/${id}`);
  if (!isUuid(id)) notFound();
  let project: Project | null = null, ready = true;
  try { project = await getProject(user.id, id); } catch (e) { if (!isMissingTable(e)) throw e; ready = false; }
  if (ready && !project) notFound();
  return (
    <PlatformShell lang={lang} door="create" page="projects" admin={profile.role === "admin"} user={user} access={profile.beta_status} layout="full">
      {project ? <ProjectEditor key={project.id} lang={lang} project={project} /> : <NotReady lang={lang} />}
    </PlatformShell>
  );
}
