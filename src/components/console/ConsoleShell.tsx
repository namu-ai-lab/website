import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { Logo } from "../Logo";
import { LangSwitch } from "../Header";
import { AccountMenu } from "./AccountMenu";
import { consoleCopy } from "@/content/console";
import { lp, type Lang } from "@/i18n/config";

export type ConsoleUser = { name?: string | null; email: string; image?: string | null };
export type Access = "approved" | "pending" | "denied";
export type Page = "overview" | "playground" | "usage" | "logs" | "keys" | "limits" | "settings" | "admin";

/* The developer console's frame, after platform.openai.com: a slim top bar (the Namu mark and "API", the docs, the
   account), a sidebar in four parts (start: Home and the Playground; monitor: Usage and Logs; manage: API keys and
   Limits; and, at the foot, Settings, the beta review for admins and the language), and the page itself under a
   title and its actions. On a phone the sidebar becomes a row of tabs under the top bar. */
export function ConsoleShell({ lang, page, admin, user, access, title, lede, actions, children }:
  { lang: Lang; page: Page; admin: boolean; user: ConsoleUser; access: Access; title: string; lede?: string; actions?: ReactNode; children: ReactNode }) {
  const t = consoleCopy[lang], L = (p: string) => lp(lang, p);
  type Item = { id: Page; label: string; href: string; icon: string };
  const groups: { label?: string; items: Item[] }[] = [
    { items: [
      { id: "overview", label: t.nav.overview, href: L("/account"), icon: "home" },
      { id: "playground", label: t.nav.playground, href: L("/account/playground"), icon: "waveform" },
    ] },
    { label: t.nav.monitor, items: [
      { id: "usage", label: t.nav.usage, href: L("/account/usage"), icon: "chart" },
      { id: "logs", label: t.nav.logs, href: L("/account/logs"), icon: "logs" },
    ] },
    { label: t.nav.manage, items: [
      { id: "keys", label: t.nav.keys, href: L("/account/keys"), icon: "key" },
      { id: "limits", label: t.nav.limits, href: L("/account/limits"), icon: "gauge" },
    ] },
  ];
  const foot: Item[] = [
    { id: "settings", label: t.nav.settings, href: L("/account/settings"), icon: "sliders" },
    ...(admin ? [{ id: "admin" as Page, label: t.nav.admin, href: L("/account/admin"), icon: "person" }] : []),
  ];
  const link = (x: Item) => (
    <li key={x.id}><a href={x.href} aria-current={x.id === page ? "page" : undefined}><Icon name={x.icon} size={18} stroke={1.5} />{x.label}</a></li>
  );
  return (
    <div className="cx">
      <header className="cx-top">
        <a className="cx-brand" href={L("/api")} aria-label="Namu API">
          <Logo className="mark" id="lg-cx" /><span className="cx-api">{t.api}</span>
        </a>
        <span className={`cx-access ${access}`}>{t.access[access]}</span>
        <nav className="cx-links" aria-label={t.nav.build}>
          <a href={L("/docs")}>{t.nav.docs}</a>
          <a href={L("/docs#speech")}>{t.nav.reference}</a>
        </nav>
        <a className="cx-gear" href={L("/account/settings")} aria-label={t.nav.settings} title={t.nav.settings} aria-current={page === "settings" ? "page" : undefined}><Icon name="sliders" size={18} stroke={1.5} /></a>
        <AccountMenu lang={lang} user={user} label={t.signedIn} settings={{ label: t.nav.settings, href: L("/account/settings") }} />
      </header>
      <div className="cx-body">
        <aside className="cx-side">
          <nav aria-label={t.menu}>
            {groups.map((g, i) => (
              <div className="cx-side-group" key={i}>
                {g.label && <p className="cx-group">{g.label}</p>}
                <ul>{g.items.map(link)}</ul>
              </div>
            ))}
            <ul className="cx-side-end">{foot.map(link)}</ul>
          </nav>
          <div className="cx-side-foot">
            <a className="cx-side-doc" href={L("/docs")}><Icon name="paper" size={16} stroke={1.5} />{t.nav.docs}<Icon name="arrow-long" size={14} stroke={1.5} /></a>
            <LangSwitch lang={lang} label="Language" />
          </div>
        </aside>
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

/* The frame for the console's doors (sign-in, and the notice when accounts are switched off): the same top bar,
   with the page centred under it and no sidebar. */
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
