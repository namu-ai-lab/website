import type { ReactNode } from "react";
import { Icon } from "../Icon";
import { Logo } from "../Logo";
import { LangSwitch } from "../Header";
import { AccountMenu } from "./AccountMenu";
import { consoleCopy } from "@/content/console";
import { lp, type Lang } from "@/i18n/config";

export type ConsoleUser = { name?: string | null; email: string; image?: string | null };
export type Access = "approved" | "pending" | "denied";
type Page = "overview" | "keys" | "usage" | "admin";

/* The developer console's frame, after platform.openai.com: a slim top bar (the Namu mark and "API", the docs, the
   account), a sidebar of what you manage and what you build with, and the page itself under a title and its actions.
   On a phone the sidebar becomes a row of tabs under the top bar. */
export function ConsoleShell({ lang, page, admin, user, access, title, lede, actions, children }:
  { lang: Lang; page: Page; admin: boolean; user: ConsoleUser; access: Access; title: string; lede?: string; actions?: ReactNode; children: ReactNode }) {
  const t = consoleCopy[lang], L = (p: string) => lp(lang, p);
  const manage: { id: Page; label: string; href: string; icon: string }[] = [
    { id: "overview", label: t.nav.overview, href: L("/account"), icon: "grid" },
    { id: "keys", label: t.nav.keys, href: L("/account/keys"), icon: "key" },
    { id: "usage", label: t.nav.usage, href: L("/account/usage"), icon: "chart" },
    ...(admin ? [{ id: "admin" as Page, label: t.nav.admin, href: L("/account/admin"), icon: "person" }] : []),
  ];
  const build = [
    { label: t.nav.playground, href: L("/#try"), icon: "demo" },
    { label: t.nav.docs, href: L("/docs"), icon: "paper" },
    { label: t.nav.reference, href: L("/docs#speech"), icon: "code" },
  ];
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
        <AccountMenu lang={lang} user={user} label={t.signedIn} />
      </header>
      <div className="cx-body">
        <aside className="cx-side">
          <nav aria-label={t.menu}>
            <p className="cx-group">{t.nav.manage}</p>
            <ul>{manage.map(x => (
              <li key={x.id}><a href={x.href} aria-current={x.id === page ? "page" : undefined}><Icon name={x.icon} size={18} stroke={1.5} />{x.label}</a></li>
            ))}</ul>
            <p className="cx-group">{t.nav.build}</p>
            <ul>{build.map(x => (
              <li key={x.label}><a href={x.href}><Icon name={x.icon} size={18} stroke={1.5} />{x.label}</a></li>
            ))}</ul>
          </nav>
          <div className="cx-side-foot"><LangSwitch lang={lang} label="Language" /></div>
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
