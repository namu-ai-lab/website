import type { Metadata } from "next";
import { NotConfigured } from "@/components/account/AccountShell";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { SettingsPanel } from "@/components/console/SettingsPanel";
import { consoleCopy } from "@/content/console";
import { isLang, type Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = consoleCopy[l].settings.meta;
  return { title, description, robots: { index: false } };
}

export default async function Settings({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/account/settings");
  const me = { id: user.id, name: user.name ?? "", email: user.email, emailVerified: Boolean((user as { emailVerified?: boolean }).emailVerified) };
  return (
    <ConsoleShell lang={lang} page="settings" admin={profile.role === "admin"} user={user} access={profile.beta_status}
      title={consoleCopy[lang].nav.settings} lede={consoleCopy[lang].settings.lede}>
      <SettingsPanel lang={lang} me={me} since={new Date(profile.created_at).toISOString()} allowanceMin={profile.monthly_audio_seconds / 60} />
    </ConsoleShell>
  );
}
