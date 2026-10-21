import type { Metadata } from "next";
import { AuthFlow } from "@/components/account/AuthFlow";
import { NotConfigured } from "@/components/account/AccountShell";
import { AuthFrame } from "@/components/console/ConsoleShell";
import { accountCopy } from "@/content/account";
import { isLang, type Lang } from "@/i18n/config";
import { nextPath } from "@/lib/account";
import { hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = accountCopy[l].auth.meta.reset;
  return { title, description, robots: { index: false } };
}

/* Forgotten passwords. Neon Auth's emailed link comes back here with ?token=…, or with ?error=INVALID_TOKEN once
   the link has expired or been used. */
export default async function ResetPassword({ params, searchParams }:
  { params: Promise<{ lang: string }>; searchParams: Promise<{ next?: string; token?: string; error?: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const sp = await searchParams;
  const start = sp.error ? "expired" : sp.token ? "new" : "reset";
  return (
    <AuthFrame lang={lang}>
      <AuthFlow lang={lang} door="reset" next={nextPath(lang, sp.next)} providers={[]} start={start} token={sp.token} />
    </AuthFrame>
  );
}
