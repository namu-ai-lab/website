"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/* The platform (Namu Create /create, Namu Agents /agents, Namu API /account) and its doors (log in, sign up, reset a password) are an app, as platform.openai.com is to openai.com: they bring their
   own top bar and sidebar, so the site's header and footer stand aside there. English paths have no prefix (/account),
   French ones do (/fr/account); inside the app both are served from /[lang]. */
const APP = /^(?:\/(?:en|fr))?\/(?:account|create|agents|login|signup|reset-password)(?:\/|$)/;

export function SiteChrome({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const app = APP.test(usePathname() ?? "/");
  return (
    <>
      {!app && header}
      <main id="main" className={app ? "cx-main" : undefined}>{children}</main>
      {!app && footer}
    </>
  );
}
