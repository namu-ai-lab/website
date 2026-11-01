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
import { isUuid, type Interpretation, type InterpretationSummary } from "@/lib/interpretation-shape";
import { getInterpretation, listInterpretations } from "@/lib/interpretations";
import { voicesOf } from "@/lib/kit";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params, l: Lang = isLang(lang) ? lang : "en";
  return { title: `${createCopy[l].interpret.history} · ${platformCopy[l].nav.interpret} · Namu Create`, robots: { index: false } };
}

/* Create > Interpreter > History (components/create/InterpretHistory): every conversation kept, on its own page, away
   from the conversation itself; ?c=<id> opens one, to hear it again or continue it. */
export default async function InterpretHistoryPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ c?: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/create/interpret/history");
  const t = createCopy[lang].interpret, L = (p: string) => lp(lang, p);
  const asked = (await searchParams).c;
  const kitVoices = await voicesOf(user.id).catch(e => { if (isMissingTable(e)) return {}; throw e; });
  let list: InterpretationSummary[] = [], open: Interpretation | null = null, ready = true;
  try {
    if (isUuid(asked)) open = await getInterpretation(user.id, asked);
    if (!open) list = await listInterpretations(user.id);
  } catch (e) { if (!isMissingTable(e)) throw e; ready = false; }
  const actions = open
    ? <>
        <a className="cx-btn sm" href={L("/create/interpret/history")}><Icon name="arrow-back" size={16} stroke={1.6} />{t.history}</a>
        <a className="cx-btn sm" href={L(`/create/interpret?c=${open.id}`)}><Icon name="microphone" size={16} stroke={1.6} />{t.resume}</a>
      </>
    : <>
        <a className="cx-btn sm" href={L("/create/interpret")}><Icon name="arrow-back" size={16} stroke={1.6} />{t.back}</a>
        <a className="cx-btn sm" href={L("/create/interpret")}><Icon name="plus" size={16} stroke={1.6} />{t.fresh}</a>
      </>;
  return (
    <PlatformShell lang={lang} door="create" page="interpret" user={user} access={profile.beta_status} title={t.history} actions={actions}>
      <InterpretHistory lang={lang} list={list} open={open} kitVoices={kitVoices} ready={ready} />
    </PlatformShell>
  );
}
