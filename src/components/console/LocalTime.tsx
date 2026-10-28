"use client";

import { useEffect, useState } from "react";
import type { Lang } from "@/i18n/config";
import { formatDate, hasTime, intlLocale, type DateStyle } from "@/i18n/format";

/* A date or time in the reader's own time zone. The server renders it in UTC (it cannot know the zone), and so does
   the browser's first render, so hydration matches even near midnight; after mount it is rewritten in the local zone.
   A time keeps a "UTC" mark until then. `rel` shows "5 min ago" for the last day. */
export function LocalTime({ iso, lang, style = "dateTime", rel = false }: { iso: string | Date; lang: Lang; style?: DateStyle; rel?: boolean }) {
  const ms = new Date(iso).getTime();
  const [text, setText] = useState(() => formatDate(lang, iso, { style }) + (hasTime(style) ? " UTC" : ""));
  useEffect(() => {
    const d = (Date.now() - ms) / 1000;
    if (rel && d >= 0 && d < 86400) {
      const r = new Intl.RelativeTimeFormat(intlLocale(lang), { numeric: "auto", style: "short" });
      setText(d < 60 ? r.format(-Math.round(d), "second") : d < 3600 ? r.format(-Math.round(d / 60), "minute") : r.format(-Math.round(d / 3600), "hour"));
    } else setText(formatDate(lang, new Date(ms), { style, zone: "local" }));
  }, [ms, lang, style, rel]);
  const at = new Date(ms).toISOString();
  return <time dateTime={at} title={at.replace("T", " ").slice(0, 19) + " UTC"}>{text}</time>;
}
