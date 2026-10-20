import type { Metadata } from "next";
import { AccountShell, NotConfigured } from "@/components/account/AccountShell";
import { BetaRequest } from "@/components/account/BetaRequest";
import { KeysManager } from "@/components/account/KeysManager";
import { accountCopy } from "@/content/account";
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
  const t = accountCopy[lang].keys;
  // Only this user's rows, and never the key_hash column.
  const data = profile.beta_status === "approved"
    ? await sql<KeyRow>(`select ${KEY_COLUMNS} from public.api_keys where user_id = $1 order by created_at desc`, [user.id])
    : [];

  return (
    <AccountShell lang={lang} active="keys" admin={profile.role === "admin"} h1={t.h1} lede={t.lede}>
      {profile.beta_status === "approved"
        ? <KeysManager lang={lang} initial={data} apiBase={apiBase} />
        : <BetaRequest lang={lang} status={profile.beta_status} useCase={profile.use_case} />}
    </AccountShell>
  );
}
