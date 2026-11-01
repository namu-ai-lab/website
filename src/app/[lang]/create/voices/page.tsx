import { NotConfigured } from "@/components/account/AccountShell";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { VoiceLibrary } from "@/components/platform/VoiceLibrary";
import { platformMetadata } from "@/components/platform/meta";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "create", t => t.nav.voices);

export default async function Voices({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/create/voices");
  return (
    <PlatformShell lang={lang} door="create" page="voices" user={user} access={profile.beta_status} title={platformCopy[lang].nav.voices}>
      <VoiceLibrary lang={lang} />
    </PlatformShell>
  );
}
