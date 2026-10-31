import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotConfigured } from "@/components/account/AccountShell";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { AdminBeta } from "@/components/account/AdminBeta";
import { accountCopy } from "@/content/account";
import { isLang, type Lang } from "@/i18n/config";
import { allProfiles, profileRow, requireAccount } from "@/lib/account";
import { hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = accountCopy[l].admin.meta;
  return { title, description, robots: { index: false } };
}

export default async function Admin({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/account/admin");
  if (profile.role !== "admin") notFound();
  const t = accountCopy[lang].admin;
  // Reads every profile only after the admin check above, newest first; writes go through /api/admin/beta.
  const rows = await allProfiles();

  return (
    <ConsoleShell lang={lang} page="admin" admin user={user} access={profile.beta_status} title={t.h1} lede={t.lede}>
      <AdminBeta lang={lang} initial={rows.map(profileRow)} me={user.id} />
    </ConsoleShell>
  );
}
