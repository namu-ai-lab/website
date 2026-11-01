"use client";

import { useState } from "react";
import { Icon } from "../Icon";
import { SIDE_COOKIE } from "./doors";

/* Opens and closes the side menu of the platform's three areas: closed, it is a rail of icons. The frame carries the
   state (data-side="open" | "closed"), set by the server from the pf_side cookie so a page never opens the wrong way,
   and written back here when it changes. Phones have the tab bar instead, and no button (platform.css). */

export function SideToggle({ closed: initial, labels }: { closed: boolean; labels: { open: string; close: string } }) {
  const [closed, setClosed] = useState(initial);
  const flip = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = !closed;
    e.currentTarget.closest("[data-side]")?.setAttribute("data-side", next ? "closed" : "open");
    document.cookie = `${SIDE_COOKIE}=${next ? "closed" : "open"}; path=/; max-age=31536000; samesite=lax`;
    setClosed(next);
  };
  const label = closed ? labels.open : labels.close;
  return (
    <button type="button" className="pf-side-toggle" onClick={flip} aria-label={label} title={label} aria-expanded={!closed}>
      <Icon name={closed ? "sidebar-open" : "sidebar"} size={18} stroke={1.5} />
    </button>
  );
}
