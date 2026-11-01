import { NotConfigured } from "@/components/account/AccountShell";
import { InterpretStudio } from "@/components/create/InterpretStudio";
import { interpreterLede } from "@/components/create/interpreter";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { platformMetadata } from "@/components/platform/meta";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { isMissingTable } from "@/lib/db";
import { hasAccounts } from "@/lib/env";
import type { Interpretation } from "@/lib/interpretation-shape";
import { isUuid } from "@/lib/interpretation-shape";
import { getInterpretation, listInterpretations } from "@/lib/interpretations";
import { voicesOf } from "@/lib/kit";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "create", t => t.nav.interpret);

/* Create > Interpreter (components/create/InterpretStudio): the conversation in ?c=<id>, else the last one used, so a
   reload lands where the person was; ?new=1 starts a new one. The history is its own page (./history). */
export default async function Interpret({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ c?: string; new?: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/create/interpret");
  const q = await searchParams, asked = q.c;
  const kitVoices = await voicesOf(user.id).catch(e => { if (isMissingTable(e)) return {}; throw e; });
  let current: Interpretation | null = null, ready = true;
  try {
    const id = isUuid(asked) ? asked : q.new ? undefined : (await listInterpretations(user.id, 1))[0]?.id;
    if (id) current = await getInterpretation(user.id, id);
  } catch (e) { if (!isMissingTable(e)) throw e; ready = false; }
  return (
    <PlatformShell lang={lang} door="create" page="interpret" user={user} access={profile.beta_status} title={platformCopy[lang].nav.interpret} lede={interpreterLede(lang)}>
      <InterpretStudio lang={lang} kitVoices={kitVoices} current={current} ready={ready} />
    </PlatformShell>
  );
}
