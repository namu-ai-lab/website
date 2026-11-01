import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { PlatformBar, type PlatformUser } from "./PlatformBar";
import { MENUS, type DoorId } from "./doors";
import { platformCopy } from "@/content/platform";
import { lp, type Lang } from "@/i18n/config";

export type { PlatformUser };
export type Access = "approved" | "pending" | "denied";

/* The frame of Create's and Agents' pages: the top bar (PlatformBar), then a short side menu (doors.ts) with the
   account's state at its foot, then the page. On a phone the side menu becomes a row of tabs under the bar.
   Namu's own ground, cream, as the brand asks (platform.css scopes it to .pf); the console keeps its own frame.
   layout: "page"   a title row and the content in a column (the default)
           "center" no title row; the content centred, for an area's home
           "full"   no title row and no column, for work that uses the whole width */
export function PlatformShell({ lang, door, page, user, access, title, lede, actions, layout = "page", children }: {
  lang: Lang; door: Exclude<DoorId, "api">; page: string; admin?: boolean; user: PlatformUser; access: Access;
  title?: string; lede?: string; actions?: ReactNode; layout?: "page" | "center" | "full"; children: ReactNode;
}) {
  const t = platformCopy[lang], L = (p: string) => lp(lang, p);
  return (
    <div className={`pf pf-${door}`}>
      <PlatformBar lang={lang} area={door} user={user} />
      <div className="pf-body">
        <nav className="pf-side" aria-label={t.doors[door]}>
          <ul>{MENUS[door].map(x => (
            <li key={x.id}><a href={L(x.href)} aria-current={x.id === page ? "page" : undefined}><Icon name={x.icon} size={19} stroke={1.4} />{t.nav[x.label]}</a></li>
          ))}</ul>
          <p className="pf-side-foot"><span className={`pf-access ${access}`}>{t.access[access]}</span></p>
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
