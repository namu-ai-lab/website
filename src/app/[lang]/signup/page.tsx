import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFlow } from "@/components/account/AuthFlow";
import { NotConfigured } from "@/components/account/AccountShell";
import { AuthFrame } from "@/components/console/ConsoleShell";
import { accountCopy } from "@/content/account";
import { isLang, type Lang } from "@/i18n/config";
import { nextPath } from "@/lib/account";
import { currentUser } from "@/lib/auth";
import { hasAccounts, providers } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = accountCopy[l].auth.meta.signup;
  return { title, description, robots: { index: false } };
}

/* New accounts. Someone new back from Google or GitHub lands on ?step=about, signed in, for the last question. */
export default async function Signup({ params, searchParams }:
  { params: Promise<{ lang: string }>; searchParams: Promise<{ next?: string; step?: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const sp = await searchParams;
  const next = nextPath(lang, sp.next);
  const signedIn = Boolean(await currentUser());
  if (signedIn && sp.step !== "about") redirect(next);
  return (
    <AuthFrame lang={lang}>
      <AuthFlow lang={lang} door="signup" next={next} providers={providers()} start={signedIn ? "about" : undefined} />
    </AuthFrame>
  );
}
