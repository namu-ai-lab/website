"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "../Icon";

/* Get started on Home, with OpenAI's Dismiss: once dismissed it stays hidden in this browser (localStorage; if storage
   is unavailable it simply shows again). */
export function Dismissable({ id, title, label, children }: { id: string; title: string; label: string; children: ReactNode }) {
  const key = `namu-console:${id}:dismissed`;
  const [hidden, setHidden] = useState(false);
  useEffect(() => { try { if (localStorage.getItem(key) === "1") setHidden(true); } catch { /* private mode: keep showing */ } }, [key]);
  if (hidden) return null;
  return (
    <section aria-labelledby={`${id}-h`}>
      <div className="cx-get-h">
        <h2 id={`${id}-h`}>{title}</h2>
        <button type="button" className="cx-dismiss" onClick={() => { setHidden(true); try { localStorage.setItem(key, "1"); } catch { /* ignore */ } }}>
          <Icon name="close" size={15} stroke={1.6} />{label}
        </button>
      </div>
      {children}
    </section>
  );
}
