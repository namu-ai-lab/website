import { NotConfigured } from "@/components/account/AccountShell";
import { ReadStudio } from "@/components/create/ReadStudio";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { platformMetadata } from "@/components/platform/meta";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "create", t => t.nav.read);

/* Create > Read a voice note (components/create/ReadStudio). */
export default async function Read({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/create/read");
  return (
    <PlatformShell lang={lang} door="create" page="read" user={user} access={profile.beta_status} title={platformCopy[lang].nav.read}>
      <ReadStudio lang={lang} />
    </PlatformShell>
  );
}
