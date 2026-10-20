import { notFound } from "next/navigation";
import { BetaRequest } from "@/components/account/BetaRequest";
import { ConsoleShell, type Access } from "@/components/console/ConsoleShell";
import { KeysTable } from "@/components/console/KeysTable";
import { Overview } from "@/components/console/Overview";
import { UsageView, type UsageDay } from "@/components/console/UsageView";
import { accountCopy } from "@/content/account";
import { consoleCopy } from "@/content/console";
import type { Lang } from "@/i18n/config";
import { apiBase } from "@/lib/env";
import type { KeyRow, Scope } from "@/lib/key-shape";

/* Development only: the console with made-up keys and usage, so it can be designed and tested without the accounts
   database. /account/preview?view=overview|keys|usage|empty|pending. Not served in production. */
export const dynamic = "force-dynamic";

const ago = (d: number) => new Date(Date.now() - d * 864e5).toISOString();
const KEYS: KeyRow[] = [
  { id: "k1", name: "Production server", prefix: "namu_sk_9fQ2", scopes: ["transcribe", "speech", "translate", "converse"], is_demo: false, created_at: ago(34), last_used_at: ago(0.1), revoked_at: null },
  { id: "k2", name: "Clinic line (staging)", prefix: "namu_sk_Lm7t", scopes: ["speech", "transcribe"], is_demo: false, created_at: ago(12), last_used_at: ago(2), revoked_at: null },
  { id: "k3", name: "Website demo", prefix: "namu_sk_D3mo", scopes: ["speech", "transcribe", "translate"], is_demo: true, created_at: ago(30), last_used_at: ago(0.02), revoked_at: null },
  { id: "k4", name: "Notebook experiments", prefix: "namu_sk_x81K", scopes: ["transcribe"], is_demo: false, created_at: ago(5), last_used_at: null, revoked_at: null },
  { id: "k5", name: "Old laptop", prefix: "namu_sk_aa0P", scopes: ["transcribe", "speech", "translate", "converse"], is_demo: false, created_at: ago(80), last_used_at: ago(40), revoked_at: ago(39) },
];

export default async function Preview({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ view?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const lang = (await params).lang as Lang;
  const view = (await searchParams).view ?? "overview";
  const user = { name: "Mouhamad Mamane", email: "mouhamad@namu-ai.org" };
  const access: Access = view === "pending" ? "pending" : "approved";
  const month = new Date().toISOString().slice(0, 7), today = new Date().getUTCDate();
  const daily: UsageDay[] = [];
  const seed = (i: number, k: number) => Math.abs(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
  for (let d = 1; d <= today; d++) (["speech", "transcribe", "translate", "converse"] as Scope[]).forEach((ep, k) => {
    const r = Math.round(seed(d, k) * [38, 26, 9, 4][k] * (0.5 + d / today));
    if (r) daily.push({ day: `${month}-${String(d).padStart(2, "0")}`, endpoint: ep, requests: r });
  });
  const totals = (["speech", "transcribe", "translate", "converse"] as Scope[]).map((ep, k) => {
    const requests = daily.filter(x => x.endpoint === ep).reduce((s, x) => s + x.requests, 0);
    return { endpoint: ep, requests, errors: Math.round(requests * [0.01, 0.02, 0.04, 0.06][k]), audioMin: requests * [0.08, 0.25, 0.3, 0.6][k], chars: ep === "speech" ? requests * 64 : 0 };
  });
  const used = totals.reduce((s, r) => s + r.audioMin, 0);
  const t = consoleCopy[lang];
  const page = view === "keys" || view === "empty" ? "keys" : view === "usage" ? "usage" : "overview";
  return (
    <ConsoleShell lang={lang} page={page} admin user={user} access={access}
      title={page === "keys" ? accountCopy[lang].keys.h1 : page === "usage" ? accountCopy[lang].usage.h1 : t.overview.h1("Mouhamad")}
      lede={page === "keys" ? t.keys.lede : page === "usage" ? t.usage.lede : t.overview.lede}>
      {page === "keys" && <KeysTable lang={lang} initial={view === "empty" ? [] : KEYS} apiBase={apiBase} />}
      {page === "usage" && <UsageView lang={lang} month={month} limitMin={600} daily={daily} totals={totals} />}
      {page === "overview" && <Overview lang={lang} apiBase={apiBase} approved={access === "approved"} usedMin={used} limitMin={600}
        requests={totals.reduce((s, r) => s + r.requests, 0)} activeKeys={4}
        beta={access === "approved" ? undefined : <BetaRequest lang={lang} status="pending" useCase={null} />} />}
    </ConsoleShell>
  );
}
