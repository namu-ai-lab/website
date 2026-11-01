import { NotConfigured } from "@/components/account/AccountShell";
import { SpeakStudio } from "@/components/create/SpeakStudio";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { platformMetadata } from "@/components/platform/meta";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { isLangCode, isVoiceId } from "@/lib/catalog";
import { isMissingTable } from "@/lib/db";
import { hasAccounts } from "@/lib/env";
import { voicesOf } from "@/lib/kit";
import type { Message } from "@/lib/project-shape";
import { listMessages } from "@/lib/projects";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "create", t => t.nav.speak);

/* Create > Voice message (components/create/SpeakStudio). ?voice=<id>&lang=<code> opens with that voice in that
   language (its first when it does not speak it), as Voices > Use links. */
export default async function Speak({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ voice?: string; lang?: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/create/speak");
  const { voice: asked, lang: askedLang } = await searchParams;
  const kitVoices = await voicesOf(user.id).catch(e => { if (isMissingTable(e)) return {}; throw e; });
  let recent: Message[] = [], ready = true;
  try { recent = await listMessages(user.id); } catch (e) { if (!isMissingTable(e)) throw e; ready = false; }
  return (
    <PlatformShell lang={lang} door="create" page="speak" user={user} access={profile.beta_status} title={platformCopy[lang].nav.speak}>
      <SpeakStudio lang={lang} kitVoices={kitVoices} initialVoice={isVoiceId(asked) ? asked : undefined} initialLang={isLangCode(askedLang) ? askedLang : undefined} recent={recent} ready={ready} />
    </PlatformShell>
  );
}
