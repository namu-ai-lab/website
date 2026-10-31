import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";

/* Shown where a page's table has not been made yet (a migration not applied to this database). */
export function NotReady({ lang }: { lang: Lang }) {
  const [h, p] = platformCopy[lang].notReady;
  return <div className="pf-empty"><span className="pj-empty-orb" aria-hidden="true" /><h2>{h}</h2><p>{p}</p></div>;
}
