import type { Lang } from "./config";

/* One way to write dates and numbers on the site, per language. Pages and components format through these rather than
   calling Intl themselves, so a key's "created" date, a log's time and a post's date read alike, in English (British
   order: 22 Oct 2026) and in French.

   Dates always name their time zone. The server can only know UTC, and the first render of a client component must
   match the server's HTML, so both use UTC; <LocalTime> then rewrites a moment in the reader's own zone after mount.
   Calendar facts that belong to no one's local day (a post's date, the 1st of next month) simply stay in UTC. */

export const intlLocale = (lang: Lang) => (lang === "fr" ? "fr-FR" : "en-GB");

const DATE_STYLES = {
  day: { day: "numeric", month: "long", year: "numeric" },                         // 22 October 2026 · 22 octobre 2026
  dayShort: { day: "numeric", month: "short", year: "numeric" },                   // 22 Oct 2026 · 22 oct. 2026
  dayMonth: { day: "numeric", month: "long" },                                     // 22 October
  dayMonthShort: { day: "numeric", month: "short" },                               // 22 Oct
  time: { hour: "2-digit", minute: "2-digit" },                                    // 14:32 (in the reader's zone: zone "local")
  monthYear: { month: "long", year: "numeric" },                                   // October 2026
  dateTime: { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }, // 22 Oct, 14:05
  weekday: { weekday: "short" },                                                   // Thu · jeu.
} satisfies Record<string, Intl.DateTimeFormatOptions>;
export type DateStyle = keyof typeof DATE_STYLES;

/** Whether a style shows the time of day (and so needs its zone said when it is not the reader's own). */
export const hasTime = (style: DateStyle) => style === "dateTime";

/** A date in the page's language. `zone` is an IANA zone, "UTC" by default, or "local" for the runtime's own zone
    (only after mount, in the browser). Accepts an ISO string or a Date (the database driver returns Dates). */
export function formatDate(lang: Lang, value: string | Date, { style = "day", zone = "UTC" }: { style?: DateStyle; zone?: string } = {}): string {
  const timeZone = zone === "local" ? undefined : zone;
  return new Intl.DateTimeFormat(intlLocale(lang), { ...DATE_STYLES[style], timeZone }).format(new Date(value));
}

/** Counts, minutes and seconds: grouped digits and at most one decimal ("1,234.5" · "1 234,5"). Reuse the
    formatter for a table's worth of numbers. */
export const numberFormat = (lang: Lang) => new Intl.NumberFormat(intlLocale(lang), { maximumFractionDigits: 1 });
export const formatNumber = (lang: Lang, n: number) => numberFormat(lang).format(n);

/** A length of audio as a clock: 75 → "1:15". The same in every language. */
export const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
