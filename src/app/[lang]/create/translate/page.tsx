import { NotConfigured } from "@/components/account/AccountShell";
import { TranslateStudio } from "@/components/create/TranslateStudio";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { platformMetadata } from "@/components/platform/meta";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "create", t => t.nav.translate);

/* Create > Translate (components/create/TranslateStudio). */
export default async function Translate({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/create/translate");
  return (
    <PlatformShell lang={lang} door="create" page="translate" user={user} access={profile.beta_status} title={platformCopy[lang].nav.translate}>
      <TranslateStudio lang={lang} />
    </PlatformShell>
  );
}
