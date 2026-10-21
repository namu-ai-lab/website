import { accountCopy } from "@/content/account";
import type { Lang } from "@/i18n/config";

/* What a paused account sees instead of its key controls. Every account is active from sign-up; only an admin
   pauses one (Accounts page), and the gateway refuses its keys until it is resumed. */
export function AccountPaused({ lang }: { lang: Lang }) {
  const t = accountCopy[lang].paused;
  return (
    <div className="panel acct-card">
      <h2 className="h3">{t.h}</h2>
      <p className="muted">{t.body}</p>
      <div className="acts"><a className="pill" href="mailto:contact@namuai.org?subject=Namu%20API%20account">{t.contact}</a></div>
    </div>
  );
}
