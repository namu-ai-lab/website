import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { Logo } from "../Logo";
import { LangSwitch } from "../Header";
import { AccountMenu } from "./AccountMenu";
import { ConsoleDrawer } from "./ConsoleDrawer";
import { consoleCopy } from "@/content/console";
import { lp, type Lang } from "@/i18n/config";

export type ConsoleUser = { name?: string | null; email: string; image?: string | null };
export type Access = "approved" | "pending" | "denied";
export type Page = "overview" | "playground" | "usage" | "logs" | "keys" | "limits" | "settings" | "admin";

/* The developer console's frame, after platform.openai.com: no top bar; a sidebar with the Namu mark and the Beta pill
   at the top, one flat list of pages (Home, Playground, API keys, Usage, Logs, Limits, Settings, and Accounts for an
   admin), the docs and the signed-in account at the foot; then the page under its title. In the Lab's own type
   (Lab Sans, sentence case, no monospace outside code) and colours. On a phone the same sidebar opens as a drawer
   from a slim bar (ConsoleDrawer). */
export function ConsoleShell({ lang, page, admin, user, access, title, lede, actions, children }:
  { lang: Lang; page: Page; admin: boolean; user: ConsoleUser; access: Access; title: string; lede?: string; actions?: ReactNode; children: ReactNode }) {
  const t = consoleCopy[lang], L = (p: string) => lp(lang, p);
  type Item = { id: Page; label: string; href: string; icon: string };
  const items: Item[] = [
    { id: "overview", label: t.nav.overview, href: L("/account"), icon: "home" },
    { id: "playground", label: t.nav.playground, href: L("/account/playground"), icon: "waveform" },
    { id: "keys", label: t.nav.keys, href: L("/account/keys"), icon: "key" },
    { id: "usage", label: t.nav.usage, href: L("/account/usage"), icon: "chart" },
    { id: "logs", label: t.nav.logs, href: L("/account/logs"), icon: "logs" },
    { id: "limits", label: t.nav.limits, href: L("/account/limits"), icon: "gauge" },
    { id: "settings", label: t.nav.settings, href: L("/account/settings"), icon: "sliders" },
    ...(admin ? [{ id: "admin" as Page, label: t.nav.admin, href: L("/account/admin"), icon: "person" }] : []),
  ];
  return (
    <div className="cx">
      <ConsoleDrawer labels={{ open: t.openMenu, close: t.closeMenu, menu: t.menu }} bar={<>
        <a className="cx-brand" href={L("/api")} aria-label="Namu API"><Logo className="mark" id="lg-cx-bar" /><span className="cx-api">{t.api}</span></a>
        <span className={`cx-access ${access}`}><i aria-hidden="true" />{t.access[access]}</span>
      </>}>
        <div className="cx-side-top">
          <a className="cx-brand" href={L("/api")} aria-label="Namu API"><Logo className="mark" id="lg-cx" /><span className="cx-api">{t.api}</span></a>
          <span className={`cx-access ${access}`}><i aria-hidden="true" />{t.access[access]}</span>
        </div>
        <nav className="cx-nav" aria-label={t.menu}>
          <ul>{items.map(x => (
            <li key={x.id}><a href={x.href} aria-current={x.id === page ? "page" : undefined}><Icon name={x.icon} size={18} stroke={1.4} />{x.label}</a></li>
          ))}</ul>
        </nav>
        <div className="cx-side-foot">
          <a className="cx-side-doc" href={L("/docs")}>{t.nav.docs}<Icon name="external" size={14} stroke={1.5} /></a>
          <a className="cx-side-doc" href={L("/docs#speech")}>{t.nav.reference}<Icon name="external" size={14} stroke={1.5} /></a>
          <AccountMenu lang={lang} user={user} label={t.signedIn} settings={{ label: t.nav.settings, href: L("/account/settings") }} />
          <LangSwitch lang={lang} label="Language" />
        </div>
      </ConsoleDrawer>
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
  );
}

/* The frame for the console's doors (sign-in, and the notice when accounts are switched off): a slim bar with the
   mark and the way back, the page centred under it. */
export function AuthFrame({ lang, children }: { lang: Lang; children: ReactNode }) {
  const t = consoleCopy[lang], L = (p: string) => lp(lang, p);
  return (
    <div className="cx cx-auth">
      <header className="cx-top">
        <a className="cx-brand" href={L("/api")} aria-label="Namu API"><Logo className="mark" id="lg-cx-auth" /><span className="cx-api">{t.api}</span></a>
        <nav className="cx-links" aria-label={t.nav.build}><a href={L("/docs")}>{t.nav.docs}</a><a href={L("/")}>Namu AI Lab</a></nav>
      </header>
      <div className="cx-auth-body">{children}</div>
    </div>
  );
}
