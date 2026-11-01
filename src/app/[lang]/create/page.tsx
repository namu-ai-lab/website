import { NotConfigured } from "@/components/account/AccountShell";
import { CreateHome } from "@/components/create/CreateHome";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { platformMetadata } from "@/components/platform/meta";
import type { Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { isMissingTable } from "@/lib/db";
import { hasAccounts } from "@/lib/env";
import { voicesOf } from "@/lib/kit";
import type { Message } from "@/lib/project-shape";
import { listMessages } from "@/lib/projects";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "create", t => t.nav.home);

/* Namu Create's home (components/create/CreateHome): the question and the box, the tools, the voices, then ideas and
   the messages already made. */
export default async function CreateHomePage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/create");
  let recent: Message[] = [], ready = true;
  try { recent = await listMessages(user.id); } catch (e) { if (!isMissingTable(e)) throw e; ready = false; }
  const kitVoices = await voicesOf(user.id).catch(e => { if (isMissingTable(e)) return {}; throw e; });
  return (
    <PlatformShell lang={lang} door="create" page="home" user={user} access={profile.beta_status} layout="center">
      <CreateHome lang={lang} recent={recent} ready={ready} kitVoices={kitVoices} />
    </PlatformShell>
  );
}
