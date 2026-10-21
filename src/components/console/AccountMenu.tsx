"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { accountCopy } from "@/content/account";
import type { Lang } from "@/i18n/config";
import type { ConsoleUser } from "./ConsoleShell";

/* The account at the right of the console's top bar: its initial in a circle, and a menu with who is signed in and
   the way out. Closes on a click outside or Escape. */
export function AccountMenu({ lang, user, label, settings }: { lang: Lang; user: ConsoleUser; label: string; settings?: { label: string; href: string } }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="cx-account" ref={box}>
      <button type="button" className="cx-avatar" aria-haspopup="menu" aria-expanded={open} aria-label={`${label} ${user.email}`} onClick={() => setOpen(o => !o)}>
        {user.image ? <img src={user.image} alt="" /> : initial}
      </button>
      {open && (
        <div className="cx-menu" role="menu">
          <p className="cx-menu-who"><span>{label}</span>{user.name && <strong>{user.name}</strong>}<em>{user.email}</em></p>
          {settings && <a role="menuitem" href={settings.href}>{settings.label}</a>}
          <button type="button" role="menuitem" onClick={async () => { await authClient.signOut(); window.location.href = "/"; }}>{accountCopy[lang].nav.signOut}</button>
        </div>
      )}
    </div>
  );
}
