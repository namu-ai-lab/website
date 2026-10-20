import type { ReactNode } from "react";
import { lp, type Lang } from "@/i18n/config";
import { accountCopy } from "@/content/account";
import { SignOut } from "./LoginForm";

/* The frame of every account page: title, the dashboard's tabs, and sign-out. */
export function AccountShell({ lang, active, admin, h1, lede, children }:
  { lang: Lang; active: "keys" | "usage" | "admin"; admin: boolean; h1: string; lede: string; children: ReactNode }) {
  const t = accountCopy[lang].nav;
  const tabs = [
    { id: "keys", label: t.keys, href: lp(lang, "/account/keys") },
    { id: "usage", label: t.usage, href: lp(lang, "/account/usage") },
    ...(admin ? [{ id: "admin", label: t.admin, href: lp(lang, "/account/admin") }] : []),
  ];
  return (
    <div className="page-top acct wrap">
      <nav className="acct-nav" aria-label={t.dashboard}>
        <ul>
          {tabs.map(x => <li key={x.id}><a href={x.href} aria-current={x.id === active ? "page" : undefined}>{x.label}</a></li>)}
          <li><a href={lp(lang, "/docs")}>{t.docs}</a></li>
        </ul>
        <SignOut label={t.signOut} />
      </nav>
      <header className="acct-head">
        <h1 className="h1">{h1}</h1>
        <p className="lede">{lede}</p>
      </header>
      {children}
    </div>
  );
}

export function NotConfigured({ lang }: { lang: Lang }) {
  return (
    <section className="page-top wrap intro">
      <p className="lede">{accountCopy[lang].notConfigured}</p>
    </section>
  );
}
