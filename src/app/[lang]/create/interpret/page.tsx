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

/* Create > Interpreter (components/create/InterpretStudio): a new conversation, or the one in ?c=<id> (the page puts
   it there after the first turn, so a reload stays in it; the history's Continue opens one). The history is its own
   page (./history). */
export default async function Interpret({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ c?: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/create/interpret");
  const asked = (await searchParams).c;
  const kitVoices = await voicesOf(user.id).catch(e => { if (isMissingTable(e)) return {}; throw e; });
  let current: Interpretation | null = null, ready = true;
  try {
    if (isUuid(asked)) current = await getInterpretation(user.id, asked);
    else await listInterpretations(user.id, 1);              // the table is there, so turns can be kept
  } catch (e) { if (!isMissingTable(e)) throw e; ready = false; }
  return (
    <PlatformShell lang={lang} door="create" page="interpret" user={user} access={profile.beta_status} title={platformCopy[lang].nav.interpret} lede={interpreterLede(lang)}>
      <InterpretStudio lang={lang} kitVoices={kitVoices} current={current} ready={ready} />
    </PlatformShell>
  );
}
