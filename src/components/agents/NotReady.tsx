import { platformCopy } from "@/content/platform";
import type { Lang } from "@/i18n/config";

/** What an Agents page shows while its tables are being set up (the migration not yet applied here). */
export function NotReady({ lang }: { lang: Lang }) {
  const [h, p] = platformCopy[lang].notReady;
  return <div className="pf-empty"><span className="ag-orb still" aria-hidden="true" /><h2>{h}</h2><p>{p}</p></div>;
}
