import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { Logo } from "../Logo";
import { LangSwitch } from "../Header";
import { AccountMenu } from "../console/AccountMenu";
import { ConsoleDrawer } from "../console/ConsoleDrawer";
import { DoorSwitch } from "./DoorSwitch";
import { DOORS, door as doorOf, type DoorId, type NavItem } from "./doors";
import { platformCopy } from "@/content/platform";
import { lp, type Lang } from "@/i18n/config";

export type PlatformUser = { name?: string | null; email: string; image?: string | null };
export type Access = "approved" | "pending" | "denied";

/* The frame of every signed-in page, in all three doors, after ElevenLabs' platform and platform.openai.com: a sidebar
   with the Namu mark (it leads back to the Lab's home page) and the door's name, the door's pages (doors.ts), its
   foot links, the account and EN/FR, and the switch between doors at the very bottom; then the page. On a phone the
   same sidebar opens as a drawer from a slim bar (ConsoleDrawer).
   layout: "page"   a title and the content in a column (the default)
           "center" no title bar; the content centred, for a door's home and empty states
           "full"   no title bar and no column, for editors that use the whole width */
export function PlatformShell({ lang, door, page, admin, user, access, title, lede, actions, layout = "page", children }: {
  lang: Lang; door: DoorId; page: string; admin: boolean; user: PlatformUser; access: Access;
  title?: string; lede?: string; actions?: ReactNode; layout?: "page" | "center" | "full"; children: ReactNode;
}) {
  const t = platformCopy[lang], L = (p: string) => lp(lang, p), d = doorOf(door);
  const label = (x: NavItem) => (typeof x.label === "string" ? t.nav[x.label] : t.tasks[x.label.task]);
  const brand = (id: string) => (
    <a className="cx-brand" href={L("/")} aria-label="Namu AI Lab"><Logo className="mark" id={id} /><span className="cx-api">{t.doors[door]}</span></a>
  );
  const hrefs = Object.fromEntries(DOORS.map(x => [x.id, L(x.home)])) as Record<DoorId, string>;
  return (
    <div className={`cx pf pf-${door}`}>
      <ConsoleDrawer labels={{ open: t.openMenu, close: t.closeMenu, menu: t.menu }} bar={<>{brand(`lg-pf-bar-${door}`)}<Beta word={t.access[access]} access={access} /></>}>
        <div className="cx-side-top">{brand(`lg-pf-${door}`)}<Beta word={t.access[access]} access={access} /></div>
        <nav className="cx-nav pf-nav" aria-label={t.menu}>
          {d.groups.map((g, i) => {
            const items = g.items.filter(x => !x.admin || admin);
            if (!items.length) return null;
            return (
              <div key={i} className="pf-group">
                {g.label && <p className="pf-group-label">{t.nav[g.label]}</p>}
                <ul>{items.map(x => (
                  <li key={x.id}><a href={L(x.href)} aria-current={x.id === page ? "page" : undefined}><Icon name={x.icon} size={18} stroke={1.4} />{label(x)}</a></li>
                ))}</ul>
              </div>
            );
          })}
        </nav>
        <div className="cx-side-foot">
          {d.foot?.map(f => <a key={f.href} className="cx-side-doc" href={L(f.href)}>{t.nav[f.label]}<Icon name="external" size={14} stroke={1.5} /></a>)}
          <AccountMenu lang={lang} user={user} label={t.signedIn} settings={{ label: t.nav.settings, href: L("/account/settings") }} />
          <LangSwitch lang={lang} label="Language" />
          <DoorSwitch current={door} doors={DOORS.map(({ id, orb }) => ({ id, orb }))} names={t.doors} hrefs={hrefs} label={t.switchTo} />
        </div>
      </ConsoleDrawer>
      <section className={`cx-page pf-page ${layout}`}>
        {layout === "page" && title && (
          <header className="cx-head">
            <div>
              <h1>{title}</h1>
              {lede && <p>{lede}</p>}
            </div>
            {actions && <div className="cx-head-acts">{actions}</div>}
          </header>
        )}
        {children}
      </section>
    </div>
  );
}

/* The account's state beside the door's name: Beta while it is open, a quieter word while it is set up or paused. */
function Beta({ word, access }: { word: string; access: Access }) {
  return <span className={`cx-access ${access}`}><i aria-hidden="true" />{word}</span>;
}
