import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { Icon } from "../Icon";
import { AccountMenu } from "../console/AccountMenu";
import { PlatformBar, type PlatformUser } from "./PlatformBar";
import { SideToggle } from "./SideToggle";
import { MENUS, SIDE_COOKIE, type DoorId } from "./doors";
import { platformCopy } from "@/content/platform";
import { lp, type Lang } from "@/i18n/config";

export type { PlatformUser };
export type Access = "approved" | "pending" | "denied";

/* The frame of Create's and Agents' pages: the top bar (PlatformBar), then a short side menu (doors.ts) with the
   account at its foot (who is signed in, and a word on the account only while it is being set up or paused), then
   the page. The side menu closes to a rail of icons and opens again (SideToggle; the pf_side cookie remembers). On a phone the side menu becomes a tab bar at the bottom of the screen,
   as WhatsApp has it: every page in view and under the thumb, each with its short name.
   Namu's own ground, cream, as the brand asks (platform.css scopes it to .pf); the console keeps its own frame.
   layout: "page"   a title row and the content in a column (the default)
           "center" no title row; the content centred, for an area's home
           "full"   no title row and no column, for work that uses the whole width */
export async function PlatformShell({ lang, door, page, user, access, title, lede, actions, layout = "page", children }: {
  lang: Lang; door: Exclude<DoorId, "api">; page: string; admin?: boolean; user: PlatformUser; access: Access;
  title?: string; lede?: string; actions?: ReactNode; layout?: "page" | "center" | "full"; children: ReactNode;
}) {
  const t = platformCopy[lang], L = (p: string) => lp(lang, p);
  const closed = (await cookies()).get(SIDE_COOKIE)?.value === "closed";
  return (
    <div className={`pf pf-${door}`} data-side={closed ? "closed" : "open"}>
      <PlatformBar lang={lang} area={door} user={user} />
      <div className="pf-body">
        <nav className="pf-side" aria-label={t.doors[door]}>
          <div className="pf-side-top"><SideToggle closed={closed} labels={t.side} /></div>
          <ul style={{ ["--n" as string]: MENUS[door].length }}>{MENUS[door].map(x => (
            <li key={x.id}><a href={L(x.href)} aria-current={x.id === page ? "page" : undefined} aria-label={t.nav[x.label]} title={t.nav[x.label]}><Icon name={x.icon} size={19} stroke={1.4} />
              <span className="pf-long">{t.nav[x.label]}</span><span className="pf-short" aria-hidden="true">{t.short[x.label]}</span></a></li>
          ))}</ul>
          <div className="pf-side-foot">
            {access !== "approved" && <span className={`pf-access ${access}`}>{t.access[access]}</span>}
            <AccountMenu lang={lang} user={user} label={t.signedIn} settings={{ label: t.nav.settings, href: L("/account/settings") }} />
          </div>
        </nav>
        <section className={`pf-page ${layout}`}>
          {layout === "page" && title && (
            <header className="pf-head">
              <div>
                <h1>{title}</h1>
                {lede && <p>{lede}</p>}
              </div>
              {actions && <div className="pf-head-acts">{actions}</div>}
            </header>
          )}
          {children}
        </section>
      </div>
    </div>
  );
}
