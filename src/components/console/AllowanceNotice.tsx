import { Icon } from "../Icon";
import { consoleCopy } from "@/content/console";
import { lp, type Lang } from "@/i18n/config";

/* A quiet line on API Home once the month's audio passes 80%, and when it is used up: the gateway then answers
   429 quota_exceeded until the month turns. Nothing below 80%. */
export function AllowanceNotice({ lang, usedMin, limitMin, resets }: { lang: Lang; usedMin: number; limitMin: number; resets: string }) {
  if (limitMin <= 0) return null;
  const share = usedMin / limitMin;
  if (share < 0.8) return null;
  const t = consoleCopy[lang].start, over = share >= 1;
  return (
    <p className={`cx-notice${over ? " over" : ""}`} role="status">
      <Icon name="gauge" size={17} stroke={1.5} />
      <span>{over ? t.over(resets) : t.near(Math.floor(share * 100))}</span>
      <a href={lp(lang, "/account/limits")}>{t.limitsLink}<Icon name="arrow-long" size={14} stroke={1.6} /></a>
    </p>
  );
}
