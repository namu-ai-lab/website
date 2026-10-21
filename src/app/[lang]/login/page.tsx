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
  const [title, description] = accountCopy[l].auth.meta.login;
  return { title, description, robots: { index: false } };
}

export default async function Login({ params, searchParams }:
  { params: Promise<{ lang: string }>; searchParams: Promise<{ next?: string; error?: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const sp = await searchParams;
  const next = nextPath(lang, sp.next);
  if (await currentUser()) redirect(next);
  return (
    <AuthFrame lang={lang}>
      <AuthFlow lang={lang} door="login" next={next} providers={providers()} failed={Boolean(sp.error)} />
    </AuthFrame>
  );
}
