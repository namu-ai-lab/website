import type { ReactNode } from "react";
import { Logo } from "../Logo";
import { LangSwitch } from "../Header";
import { PlatformShell, type Access, type PlatformUser } from "../platform/PlatformShell";
import { consoleCopy } from "@/content/console";
import type { ModelId } from "@/lib/catalog";
import { lp, type Lang } from "@/i18n/config";
import { copy } from "@/i18n/copy";

export type ConsoleUser = PlatformUser;
export type { Access };
export type Page = "overview" | "playground" | "usage" | "logs" | "keys" | "limits" | "settings" | "admin" | "voices" | `model-${ModelId}`;

/* The developer console is the platform's API door (Namu API, after ElevenAPI): its pages render in the platform's
   shell (components/platform), under the API door's sidebar. */
export function ConsoleShell({ lang, page, admin, user, access, title, lede, actions, children }:
  { lang: Lang; page: Page; admin: boolean; user: ConsoleUser; access: Access; title: string; lede?: string; actions?: ReactNode; children: ReactNode }) {
  return <PlatformShell lang={lang} door="api" page={page} admin={admin} user={user} access={access} title={title} lede={lede} actions={actions}>{children}</PlatformShell>;
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
