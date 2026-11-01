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
import type { Interpretation, InterpretationSummary } from "@/lib/interpretation-shape";
import { isUuid } from "@/lib/interpretation-shape";
import { getInterpretation, listInterpretations } from "@/lib/interpretations";
import { voicesOf } from "@/lib/kit";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "create", t => t.nav.interpret);

/* Create > Interpreter (components/create/InterpretStudio): the conversations kept, and the one in ?c=<id> or else the
   last one used, so a reload lands where the person was. */
export default async function Interpret({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ c?: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/create/interpret");
  const asked = (await searchParams).c;
  const kitVoices = await voicesOf(user.id).catch(e => { if (isMissingTable(e)) return {}; throw e; });
  let list: InterpretationSummary[] = [], current: Interpretation | null = null, ready = true;
  try {
    list = await listInterpretations(user.id);
    const id = isUuid(asked) ? asked : list[0]?.id;
    if (id) current = await getInterpretation(user.id, id);
  } catch (e) { if (!isMissingTable(e)) throw e; ready = false; }
  return (
    <PlatformShell lang={lang} door="create" page="interpret" user={user} access={profile.beta_status} title={platformCopy[lang].nav.interpret} lede={interpreterLede(lang)}>
      <InterpretStudio lang={lang} kitVoices={kitVoices} list={list} current={current} ready={ready} />
    </PlatformShell>
  );
}
