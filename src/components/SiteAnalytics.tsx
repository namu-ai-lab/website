"use client";

/* Vercel Web Analytics (page views and the events in lib/analytics) and Speed Insights (real visitors' load times,
   by page and country), on every page. URLs are redacted before they leave the browser (redactUrl), a browser that
   has opted out sends nothing, and one listener on the document records the clicks that matter: sign up and log in,
   links off the site, and the language switch. Tally forms and the demos record their own events. */
import { useEffect } from "react";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { OPT_OUT, redactUrl, track } from "@/lib/analytics";

const optedOut = () => { try { return localStorage.getItem(OPT_OUT) === "1"; } catch { return false; } };
function beforeSend<E extends { url: string }>(e: E): E | null {
  return optedOut() ? null : { ...e, url: redactUrl(e.url) };
}

const placeOf = (el: Element) => (el.closest("header") ? "header" : el.closest("footer") ? "footer" : "page");

export function SiteAnalytics() {
  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get("analytics");
    try {
      if (flag === "off") localStorage.setItem(OPT_OUT, "1");
      else if (flag === "on") localStorage.removeItem(OPT_OUT);
    } catch { /* storage blocked: nothing to remember */ }

    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      let url: URL;
      try { url = new URL(a.href, window.location.href); } catch { return; }
      const place = placeOf(a);
      if (url.protocol === "mailto:") { track("outbound_click", { to: "email", place }); return; }
      if (url.origin !== window.location.origin) {
        if (!url.hostname.endsWith("tally.so")) track("outbound_click", { to: url.hostname.replace(/^www\./, ""), place });
        return;                                      // Tally links record form_open themselves
      }
      if (a.closest(".lang-switch")) { track("lang_switch", { to: a.hreflang === "fr" ? "fr" : "en" }); return; }
      const path = url.pathname.replace(/^\/fr(?=\/|$)/, "") || "/";
      if (path === "/signup") track("cta_click", { cta: "start_building", place });
      else if (path === "/login") track("cta_click", { cta: "log_in", place });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return (
    <>
      <Analytics beforeSend={(e: BeforeSendEvent) => beforeSend(e)} />
      <SpeedInsights beforeSend={e => beforeSend(e)} />
    </>
  );
}
