import { NotConfigured } from "@/components/account/AccountShell";
import { SpeakStudio } from "@/components/create/SpeakStudio";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { platformMetadata } from "@/components/platform/meta";
import type { Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { isVoiceId } from "@/lib/catalog";
import { isMissingTable } from "@/lib/db";
import { hasAccounts } from "@/lib/env";
import { voicesOf } from "@/lib/kit";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "create", t => t.nav.speak);

/* Create > Speak (components/create/SpeakStudio). ?voice=<id> opens with that voice, as Voices > Use in Speak links. */
export default async function Speak({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ voice?: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/create/speak");
  const asked = (await searchParams).voice;
  const kitVoices = await voicesOf(user.id).catch(e => { if (isMissingTable(e)) return {}; throw e; });
  return (
    <PlatformShell lang={lang} door="create" page="speak" admin={profile.role === "admin"} user={user} access={profile.beta_status} layout="full">
      <SpeakStudio lang={lang} kitVoices={kitVoices} initialVoice={isVoiceId(asked) ? asked : undefined} />
    </PlatformShell>
  );
}
