import { Logo } from "../Logo";
import { LangSwitch } from "../Header";
import { AccountMenu } from "../console/AccountMenu";
import { AREAS, type DoorId } from "./doors";
import { platformCopy } from "@/content/platform";
import { lp, type Lang } from "@/i18n/config";

export type PlatformUser = { name?: string | null; email: string; image?: string | null };

/* The bar across the top of every signed-in page, in all three areas: the Namu mark (it leads back to the Lab's home
   page), Create, Agents and API in the middle, the current one marked with the Sahel dot, then EN/FR. ElevenLabs
   keeps this switch at the foot of its sidebar; here it is where everyone sees it. The account sits at the foot of
   the side menu; on a phone, where that menu is a tab bar, its circle comes up here (platform.css). */
export function PlatformBar({ lang, area, user }: { lang: Lang; area: DoorId; user: PlatformUser }) {
  const t = platformCopy[lang], L = (p: string) => lp(lang, p);
  return (
    <header className="pf-bar">
      <a className="pf-brand" href={L("/")} aria-label="Namu AI Lab"><Logo className="mark" id={`lg-pf-${area}`} /></a>
      <nav className="pf-areas" aria-label={t.platform}>
        {AREAS.map(a => <a key={a.id} href={L(a.home)} aria-current={a.id === area ? "page" : undefined}>{t.doors[a.id]}</a>)}
      </nav>
      <div className="pf-me">
        <LangSwitch lang={lang} label="Language" />
        <AccountMenu lang={lang} user={user} label={t.signedIn} settings={{ label: t.nav.settings, href: L("/account/settings") }} compact />
      </div>
    </header>
  );
}
