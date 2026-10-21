"use client";

import { useEffect, useState } from "react";

/* A time in the reader's own time zone. The server renders it in UTC (it cannot know the zone); the browser then
   rewrites it. `rel` shows "5 min ago" for the last day. */
export function LocalTime({ iso, lang, rel = false }: { iso: string; lang: string; rel?: boolean }) {
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  const fmt = (zone?: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: zone }).format(new Date(iso));
  const [text, setText] = useState(() => `${fmt("UTC")} UTC`);
  useEffect(() => {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (rel && d >= 0 && d < 86400) {
      const r = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
      setText(d < 60 ? r.format(-Math.round(d), "second") : d < 3600 ? r.format(-Math.round(d / 60), "minute") : r.format(-Math.round(d / 3600), "hour"));
    } else setText(fmt());
  }, [iso, rel]);   // eslint-disable-line react-hooks/exhaustive-deps
  return <time dateTime={iso} title={new Date(iso).toISOString().replace("T", " ").slice(0, 19) + " UTC"}>{text}</time>;
}
