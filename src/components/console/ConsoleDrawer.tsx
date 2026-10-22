"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "../Icon";

/* On phones and small tablets the console's sidebar becomes a drawer, as on platform.openai.com: a slim bar with a
   menu button, the mark and the Beta pill; the button slides in the very same sidebar as on a desktop (every page,
   the docs, the account, the language). It closes with its own button, Escape, a tap on the shade, or a change of
   page; the page behind does not scroll while it is open, and the closed drawer is inert so keyboards and screen
   readers skip it. From 861 px up the bar is hidden and the sidebar is simply there. */
const SMALL = "(max-width: 860px)";

export function ConsoleDrawer({ bar, labels, children }: { bar: ReactNode; labels: { open: string; close: string; menu: string }; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [small, setSmall] = useState(false);
  const button = useRef<HTMLButtonElement>(null), side = useRef<HTMLElement>(null);
  const path = usePathname();

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const mq = window.matchMedia(SMALL), sync = () => { setSmall(mq.matches); if (!mq.matches) setOpen(false); };
    sync(); mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!open) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    side.current?.querySelector<HTMLElement>('a[aria-current="page"]')?.focus({ preventScroll: true });
    const back = button.current;
    return () => { document.body.style.overflow = before; window.removeEventListener("keydown", onKey); back?.focus({ preventScroll: true }); };
  }, [open]);

  return (
    <>
      <header className="cx-mbar">
        <button ref={button} type="button" className="cx-mbar-btn" aria-label={labels.open} aria-expanded={open} aria-controls="cx-side" onClick={() => setOpen(true)}>
          <Icon name="menu" size={20} stroke={1.5} />
        </button>
        {bar}
      </header>
      <aside id="cx-side" ref={side} className={`cx-side${open ? " open" : ""}`} aria-label={labels.menu} inert={small && !open ? true : undefined}>
        {small && <button type="button" className="cx-side-close" aria-label={labels.close} onClick={() => setOpen(false)}><Icon name="close" size={18} stroke={1.5} /></button>}
        {children}
      </aside>
      <div className={`cx-shade${open ? " on" : ""}`} aria-hidden="true" onClick={() => setOpen(false)} />
    </>
  );
}
