import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/account/LoginForm";
import { NotConfigured } from "@/components/account/AccountShell";
import { accountCopy } from "@/content/account";
import { isLang, lp, type Lang } from "@/i18n/config";
import { currentUser } from "@/lib/auth";
import { hasAccounts, providers } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = accountCopy[l].login.meta;
  return { title, description, robots: { index: false } };
}

export default async function Login({ params, searchParams }:
  { params: Promise<{ lang: string }>; searchParams: Promise<{ next?: string; error?: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const sp = await searchParams;
  // Only same-site paths: never let sign-in bounce a fresh session to another origin.
  const next = sp.next && /^\/(?!\/)[\w\-/]*$/.test(sp.next) ? sp.next : lp(lang, "/account/keys");
  if (await currentUser()) redirect(next);
  const t = accountCopy[lang].login;
  return (
    <section className="page-top wrap intro acct-intro">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="h1">{t.h1}</h1>
      <p className="lede">{t.lede}</p>
      <LoginForm lang={lang} next={next} providers={providers()} />
      {sp.error && <p className="acct-error" role="alert">{t.error}</p>}
      <p className="meta acct-terms">{t.terms}</p>
    </section>
  );
}
