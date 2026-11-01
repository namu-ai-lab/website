import { NotConfigured } from "@/components/account/AccountShell";
import { TranscribeStudio } from "@/components/create/TranscribeStudio";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { platformMetadata } from "@/components/platform/meta";
import type { Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "create", t => t.nav.transcribe);

/* Create > Transcribe (components/create/TranscribeStudio). */
export default async function Transcribe({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/create/transcribe");
  return (
    <PlatformShell lang={lang} door="create" page="transcribe" admin={profile.role === "admin"} user={user} access={profile.beta_status} layout="center">
      <TranscribeStudio lang={lang} />
    </PlatformShell>
  );
}
