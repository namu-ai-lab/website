import { NotConfigured } from "@/components/account/AccountShell";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { platformMetadata } from "@/components/platform/meta";
import { VideoTranslator } from "@/components/projects/VideoTranslator";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "create", t => t.nav.video);

export default async function Video({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/create/video");
  return (
    <PlatformShell lang={lang} door="create" page="video" admin={profile.role === "admin"} user={user} access={profile.beta_status} title={platformCopy[lang].nav.video}>
      <VideoTranslator lang={lang} />
    </PlatformShell>
  );
}
