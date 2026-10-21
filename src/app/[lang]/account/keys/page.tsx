import type { Metadata } from "next";
import { NotConfigured } from "@/components/account/AccountShell";
import { AccountPaused } from "@/components/account/AccountPaused";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { KeysTable } from "@/components/console/KeysTable";
import { accountCopy } from "@/content/account";
import { consoleCopy } from "@/content/console";
import { isLang, type Lang } from "@/i18n/config";
import { requireAccount } from "@/lib/account";
import { sql } from "@/lib/db";
import { KEY_COLUMNS, type KeyRow } from "@/lib/key-shape";
import { apiBase, hasAccounts } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params; const l: Lang = isLang(lang) ? lang : "en";
  const [title, description] = accountCopy[l].keys.meta;
  return { title, description, robots: { index: false } };
}

export default async function Keys({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  if (!hasAccounts()) return <NotConfigured lang={lang} />;
  const { user, profile } = await requireAccount(lang, "/account/keys");
  const approved = profile.beta_status === "approved";
  // Only this user's rows, and never the key_hash column.
  const data = approved ? await sql<KeyRow>(`select ${KEY_COLUMNS} from public.api_keys where user_id = $1 order by created_at desc`, [user.id]) : [];

  return (
    <ConsoleShell lang={lang} page="keys" admin={profile.role === "admin"} user={user} access={profile.beta_status}
      title={accountCopy[lang].keys.h1} lede={consoleCopy[lang].keys.lede}>
      {approved
        ? <KeysTable lang={lang} initial={data} apiBase={apiBase} />
        : <AccountPaused lang={lang} />}
    </ConsoleShell>
  );
}
