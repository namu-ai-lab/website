import type { Metadata } from "next";
import { NotConfigured } from "@/components/account/AccountShell";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { PlaygroundConsole, type Mode } from "@/components/console/PlaygroundConsole";
import { consoleCopy } from "@/content/console";
import { isLang, type Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { hasAccounts } from "@/lib/env";
import { apiBase } from "@/lib/public-config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = consoleCopy[l].playground.meta;
  return { title, description, robots: { index: false } };
}

const MODES: Mode[] = ["speech", "transcribe", "translate", "converse"];

export default async function Playground({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ model?: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/account/playground");
  const asked = (await searchParams).model;
  const model = MODES.find(m => m === asked) ?? "speech";
  return (
    <ConsoleShell lang={lang} page="playground" admin={profile.role === "admin"} user={user} access={profile.beta_status}
      title={consoleCopy[lang].nav.playground} lede={consoleCopy[lang].playground.lede}>
      <PlaygroundConsole lang={lang} apiBase={apiBase} initial={model} />
    </ConsoleShell>
  );
}
