import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { Icon } from "../Icon";
import { Logo } from "../Logo";
import { LangSwitch } from "../Header";
import { AccountMenu } from "./AccountMenu";
import { PlatformBar } from "../platform/PlatformBar";
import { ScrollRow } from "../platform/ScrollRow";
import { SideToggle } from "../platform/SideToggle";
import { SIDE_COOKIE } from "../platform/doors";
import { platformCopy } from "@/content/platform";
import { consoleCopy } from "@/content/console";
import { lp, type Lang } from "@/i18n/config";
import { copy } from "@/i18n/copy";
import type { IconName } from "@/lib/icons";

export type ConsoleUser = { name?: string | null; email: string; image?: string | null };
export type Access = "approved" | "pending" | "denied";
export type Page = "overview" | "playground" | "usage" | "logs" | "keys" | "limits" | "settings" | "admin";

/* The developer console's frame, after platform.openai.com, under the platform's top bar (PlatformBar: the mark, the
   three areas and EN/FR): a sidebar with one flat list of pages (Home, Playground, API keys, Usage,
   Logs, Limits, Settings, and Accounts for an admin), and the docs and the account at the foot; then the page under
   its title. The sidebar closes to a rail of icons and opens again (SideToggle, shared with Create and Agents). An account being set up or paused says so at the top of the sidebar; an active one says nothing. In the
   Lab's own type (Lab Sans, sentence case, no monospace outside code) and colours. On a phone the list becomes a row
   of tabs under the bar. */
export async function ConsoleShell({ lang, page, admin, user, access, title, lede, actions, children }:
  { lang: Lang; page: Page; admin: boolean; user: ConsoleUser; access: Access; title: string; lede?: string; actions?: ReactNode; children: ReactNode }) {
  const t = consoleCopy[lang], L = (p: string) => lp(lang, p);
  type Item = { id: Page; label: string; href: string; icon: IconName };
  const items: Item[] = [
    { id: "overview", label: t.nav.overview, href: L("/account"), icon: "home" },
    { id: "playground", label: t.nav.playground, href: L("/account/playground"), icon: "waveform" },
    { id: "keys", label: t.nav.keys, href: L("/account/keys"), icon: "key" },
    { id: "usage", label: t.nav.usage, href: L("/account/usage"), icon: "chart" },
    { id: "logs", label: t.nav.logs, href: L("/account/logs"), icon: "logs" },
    { id: "limits", label: t.nav.limits, href: L("/account/limits"), icon: "gauge" },
    { id: "settings", label: t.nav.settings, href: L("/account/settings"), icon: "sliders" },
    ...(admin ? [{ id: "admin", label: t.nav.admin, href: L("/account/admin"), icon: "person" } satisfies Item] : []),
  ];
  const closed = (await cookies()).get(SIDE_COOKIE)?.value === "closed";
  return (
    <div className="cx-frame" data-side={closed ? "closed" : "open"}>
      <PlatformBar lang={lang} area="api" user={user} />
      <div className="cx">
      <ScrollRow as="aside" className="cx-side">
        <div className="cx-side-top">
          {access !== "approved" && <span className={`cx-access ${access}`}><i aria-hidden="true" />{t.access[access]}</span>}
          <SideToggle closed={closed} labels={platformCopy[lang].side} />
        </div>
        <nav className="cx-nav" aria-label={t.menu}>
          <ul>{items.map(x => (
            <li key={x.id}><a href={x.href} aria-current={x.id === page ? "page" : undefined} aria-label={x.label} title={x.label}><Icon name={x.icon} size={18} stroke={1.4} /><span className="cx-nav-label">{x.label}</span></a></li>
          ))}</ul>
        </nav>
        <div className="cx-side-foot">
          <a className="cx-side-doc" href={L("/docs")}>{t.nav.docs}<Icon name="external" size={14} stroke={1.5} /></a>
          <a className="cx-side-doc" href={L("/docs#speech")}>{t.nav.reference}<Icon name="external" size={14} stroke={1.5} /></a>
          <AccountMenu lang={lang} user={user} label={t.signedIn} settings={{ label: t.nav.settings, href: L("/account/settings") }} />
        </div>
      </ScrollRow>
      <section className="cx-page">
        <header className="cx-head">
          <div>
            <h1>{title}</h1>
            {lede && <p>{lede}</p>}
          </div>
          {actions && <div className="cx-head-acts">{actions}</div>}
        </header>
        {children}
      </section>
      </div>
    </div>
  );
}

/* The frame for the console's doors (sign-in, and the notice when accounts are switched off): a slim bar with the
   mark, the way back and the EN/FR switch, the page centred under it. */
export function AuthFrame({ lang, children }: { lang: Lang; children: ReactNode }) {
  const t = consoleCopy[lang], L = (p: string) => lp(lang, p);
  return (
    <div className="cx cx-auth">
      <header className="cx-top">
        <a className="cx-brand" href={L("/api")} aria-label="Namu API"><Logo className="mark" id="lg-cx-auth" /><span className="cx-api">{t.api}</span></a>
        <nav className="cx-links" aria-label={t.nav.build}><a href={L("/docs")}>{t.nav.docs}</a><a href={L("/")}>Namu AI Lab</a></nav>
        <LangSwitch lang={lang} label={copy[lang].nav.language} />
      </header>
      <div className="cx-auth-body">{children}</div>
    </div>
  );
}
