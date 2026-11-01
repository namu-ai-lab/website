"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { forgetRecordings } from "@/lib/recordings";
import { accountCopy } from "@/content/account";
import { lp, type Lang } from "@/i18n/config";
import type { ConsoleUser } from "./ConsoleShell";

/* The signed-in account, after platform.openai.com: the initial in a circle with the name and email beside it, at the
   foot of the side menu (compact, the circle alone, in the top bar on a phone); it opens a panel with who is signed
   in, Settings and the way out, which also forgets the Interpreter's recordings kept in this browser. Closes on a click
   outside or Escape (which hands focus back to the button). A disclosure, not an ARIA menu: two plain controls reached
   with Tab, so it does not promise the arrow-key behaviour role="menu" would. */
export function AccountMenu({ lang, user, label, settings, compact }: { lang: Lang; user: ConsoleUser; label: string; settings?: { label: string; href: string }; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();
  return (
    <div className={`cx-account${compact ? " compact" : ""}`} ref={box}>
      <button ref={trigger} type="button" className="cx-me" aria-expanded={open} aria-controls="cx-account-menu" aria-label={`${label} ${user.email}`} onClick={() => setOpen(o => !o)}>
        <span className="cx-avatar">{user.image ? <img src={user.image} alt="" /> : initial}</span>
        {!compact && <span className="cx-me-who"><strong>{user.name || user.email}</strong>{user.name && <em>{user.email}</em>}</span>}
      </button>
      {open && (
        <div className="cx-menu" id="cx-account-menu">
          <p className="cx-menu-who"><span>{label}</span><em>{user.email}</em></p>
          {settings && <a href={settings.href}>{settings.label}</a>}
          <button type="button" onClick={async () => { await authClient.signOut(); await forgetRecordings(); window.location.href = lp(lang, "/"); }}>{accountCopy[lang].nav.signOut}</button>
        </div>
      )}
    </div>
  );
}
