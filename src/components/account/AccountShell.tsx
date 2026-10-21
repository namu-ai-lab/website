import type { Lang } from "@/i18n/config";
import { accountCopy } from "@/content/account";
import { AuthFrame } from "../console/ConsoleShell";

/* Shown in place of an account page when this deployment has no accounts database (see lib/env). The pages
   themselves sit in the developer console's frame, components/console/ConsoleShell. */
export function NotConfigured({ lang }: { lang: Lang }) {
  return (
    <AuthFrame lang={lang}>
      <p className="lede">{accountCopy[lang].notConfigured}</p>
    </AuthFrame>
  );
}
