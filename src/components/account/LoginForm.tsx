"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { accountCopy } from "@/content/account";
import type { Lang } from "@/i18n/config";

type Provider = "github" | "google";

/* Sign in with GitHub or Google: whichever have OAuth credentials on the server. */
export function LoginForm({ lang, next, providers }: { lang: Lang; next: string; providers: Provider[] }) {
  const t = accountCopy[lang].login;
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState(false);

  async function go(provider: Provider) {
    setBusy(provider); setError(false);
    const { error } = await authClient.signIn.social({ provider, callbackURL: next, errorCallbackURL: `${window.location.pathname}?error=1` });
    if (error) { setError(true); setBusy(null); }       // on success the browser is already on its way to the provider
  }

  if (providers.length === 0) return <p className="acct-note">{t.none}</p>;
  return (
    <div className="acct-login">
      <div className="acct-oauth">
        {providers.includes("github") && <button type="button" className="pill lg dark" disabled={busy !== null} onClick={() => go("github")}>{busy === "github" ? t.sending : t.github}</button>}
        {providers.includes("google") && <button type="button" className="pill lg" disabled={busy !== null} onClick={() => go("google")}>{busy === "google" ? t.sending : t.google}</button>}
      </div>
      {error && <p className="acct-error" role="alert">{t.error}</p>}
    </div>
  );
}

export function SignOut({ label }: { label: string }) {
  return (
    <button type="button" className="pill" onClick={async () => { await authClient.signOut(); window.location.href = "/"; }}>{label}</button>
  );
}
