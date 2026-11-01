import { NotConfigured } from "@/components/account/AccountShell";
import { Icon } from "@/components/Icon";
import { InterpretHistory } from "@/components/create/InterpretHistory";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { createCopy } from "@/content/create";
import { platformCopy } from "@/content/platform";
import { isLang, lp, type Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { isMissingTable } from "@/lib/db";
import { hasAccounts } from "@/lib/env";
import type { InterpretationSummary } from "@/lib/interpretation-shape";
import { listInterpretations } from "@/lib/interpretations";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params, l: Lang = isLang(lang) ? lang : "en";
  return { title: `${createCopy[l].interpret.history} · ${platformCopy[l].nav.interpret} · Namu Create`, robots: { index: false } };
}

/* Create > Interpreter > History (components/create/InterpretHistory): every conversation kept, on its own page,
   away from the conversation itself. */
export default async function InterpretHistoryPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/create/interpret/history");
  const t = createCopy[lang].interpret, L = (p: string) => lp(lang, p);
  let list: InterpretationSummary[] = [], ready = true;
  try { list = await listInterpretations(user.id); } catch (e) { if (!isMissingTable(e)) throw e; ready = false; }
  return (
    <PlatformShell lang={lang} door="create" page="interpret" user={user} access={profile.beta_status} title={t.history}
      actions={<>
        <a className="cx-btn sm" href={L("/create/interpret")}><Icon name="arrow-back" size={16} stroke={1.6} />{t.back}</a>
        <a className="cx-btn sm" href={L("/create/interpret?new=1")}><Icon name="plus" size={16} stroke={1.6} />{t.fresh}</a>
      </>}>
      <InterpretHistory lang={lang} list={list} ready={ready} />
    </PlatformShell>
  );
}
