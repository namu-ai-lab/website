"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import type { Door, DoorId } from "./doors";

/* The foot of every door's sidebar, as ElevenLabs has it: the door you are in, and Switch, which opens the three doors
   upwards. Closes on a click outside, on Escape (focus goes back to Switch) and on choosing a door. A disclosure of
   plain links, so Tab reaches them; no menu role and its arrow-key promise. */
export function DoorSwitch({ current, doors, names, hrefs, label }:
  { current: DoorId; doors: Pick<Door, "id" | "orb">[]; names: Record<DoorId, string>; hrefs: Record<DoorId, string>; label: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  const here = doors.find(d => d.id === current)!;
  return (
    <div className="pf-switch" ref={box}>
      <span className="pf-door"><i className="pf-orb" style={{ background: here.orb }} aria-hidden="true" />Namu {names[current]}</span>
      <button ref={trigger} type="button" className="pf-switch-btn" aria-expanded={open} aria-controls="pf-doors" onClick={() => setOpen(o => !o)}>{label}</button>
      {open && (
        <ul className="pf-doors" id="pf-doors">
          {doors.map(d => (
            <li key={d.id}>
              <a href={hrefs[d.id]} aria-current={d.id === current ? "true" : undefined}>
                <i className="pf-orb lg" style={{ background: d.orb }} aria-hidden="true" />
                <span>Namu {names[d.id]}</span>
                {d.id === current && <Icon name="check" size={16} stroke={1.6} />}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
