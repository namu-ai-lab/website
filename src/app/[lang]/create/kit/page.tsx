import { NotConfigured } from "@/components/account/AccountShell";
import { KitEditor } from "@/components/create/KitEditor";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { platformMetadata } from "@/components/platform/meta";
import { createCopy } from "@/content/create";
import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { isMissingTable } from "@/lib/db";
import { hasAccounts } from "@/lib/env";
import { voicesOf, wordsOf } from "@/lib/kit";

export const dynamic = "force-dynamic";
export const generateMetadata = ({ params }: { params: Promise<{ lang: string }> }) => platformMetadata(params, "create", t => t.nav.kit);

/* Create > Kit (components/create/KitEditor): the organisation's word list and its voice per language. Until the
   platform's tables exist on this database, the page says it is almost ready. */
export default async function Kit({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/create/kit");
  const kit = await Promise.all([wordsOf(user.id), voicesOf(user.id)]).catch(e => { if (isMissingTable(e)) return null; throw e; });
  const [h, sub] = platformCopy[lang].notReady;
  return (
    <PlatformShell lang={lang} door="create" page="kit" admin={profile.role === "admin"} user={user} access={profile.beta_status} title={createCopy[lang].kit.title}>
      {kit ? <KitEditor lang={lang} words={kit[0].map(({ term, say, lang: l }) => ({ term, say, lang: l }))} voices={kit[1]} />
        : <div className="pf-empty"><h2>{h}</h2><p>{sub}</p></div>}
    </PlatformShell>
  );
}
