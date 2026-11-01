"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "../Icon";
import { resample } from "../platform/media";
import { interpretations } from "./client";
import { createCopy } from "@/content/create";
import { platformCopy } from "@/content/platform";
import { lp, type Lang } from "@/i18n/config";
import { formatDate } from "@/i18n/format";
import { WRITTEN } from "@/lib/catalog";
import type { InterpretationSummary, PrintTurn } from "@/lib/interpretation-shape";
import { forgetSome } from "@/lib/recordings";

/* The Interpreter's history, on its own page: every conversation kept, newest first, each drawn as its voices (the
   local language above the line in Kola, French below in Sahel), with when it was and how many exchanges. A card
   reopens the conversation in the Interpreter; the bin deletes it, asked twice, with its recordings in this browser. */
export function InterpretHistory({ lang: ui, list: first, ready }: { lang: Lang; list: InterpretationSummary[]; ready: boolean }) {
  const t = createCopy[ui].interpret, p = platformCopy[ui];
  const [list, setList] = useState(first), [err, setErr] = useState(false);
  const mounted = useMounted();
  const remove = async (id: string) => {
    const ids = await interpretations.get(id).then(x => x.turns.map(u => u.id)).catch(() => []);
    try { await interpretations.remove(id); } catch { setErr(true); return; }
    void forgetSome(ids);
    setList(ls => ls.filter(x => x.id !== id));
  };
  if (!ready) return <p className="cr-none cr-hist-none">{p.notReady[1]}</p>;
  if (!list.length) return <p className="cr-none cr-hist-none">{t.none}</p>;
  return (
    <>
      {err && <p className="cx-error" role="alert">{createCopy[ui].errors.generic}</p>}
      <ul className="cr-hist">
        {list.map(x => (
          <li key={x.id}>
            <a className="cr-hist-card" href={lp(ui, `/create/interpret?c=${x.id}`)}>
              <VoicePrint turns={x.print} />
              <span className="cr-hist-when">{mounted ? whenLabel(x.updatedAt, ui) : ""}</span>
              <span className="cr-hist-count">{t.exchanges(x.count)}</span>
            </a>
            <Forget label={t.remove} sure={t.sure} onYes={() => void remove(x.id)} />
          </li>
        ))}
      </ul>
    </>
  );
}

/** A conversation drawn as its voices: each turn's outline in its share of the width, the local language above the
    line and French below, so a dialogue looks like one. */
function VoicePrint({ turns }: { turns: PrintTurn[] }) {
  const N = 44, total = turns.reduce((s, x) => s + Math.max(x.seconds, 1), 0) || 1;
  const cols: { side: "a" | "b"; h: number }[] = [];
  turns.forEach((x, i) => {
    const n = i === turns.length - 1 ? N - cols.length : Math.max(2, Math.round((Math.max(x.seconds, 1) / total) * N));
    const take = Math.max(0, Math.min(n, N - cols.length));
    const shape = x.peaks.length ? resample(x.peaks, Math.max(take, 1)) : Array(take).fill(30);
    for (let k = 0; k < take; k++) cols.push({ side: x.from === WRITTEN ? "b" : "a", h: Math.max(8, shape[k] ?? 30) });
  });
  return (
    <span className="cr-print" aria-hidden="true">
      {cols.map((x, i) => <i key={i} data-side={x.side} style={{ ["--h" as string]: `${x.h}%` }} />)}
    </span>
  );
}

/** Delete, asked twice: the first press turns the bin into the question, the second deletes. */
function Forget({ label, sure, onYes }: { label: string; sure: string; onYes: () => void }) {
  const [asking, setAsking] = useState(false);
  useEffect(() => { if (!asking) return; const id = window.setTimeout(() => setAsking(false), 4000); return () => clearTimeout(id); }, [asking]);
  return asking
    ? <button key="sure" type="button" className="cr-hist-del sure" onClick={onYes} onBlur={() => setAsking(false)} autoFocus>{sure}</button>
    : <button key="ask" type="button" className="cr-hist-del" aria-label={label} title={label} onClick={() => setAsking(true)}><Icon name="trash" size={14} stroke={1.6} /></button>;
}

/* Days and times in the reader's own zone, so they appear only once the page runs in the browser. */
const never = () => () => {};
const useMounted = () => useSyncExternalStore(never, () => true, () => false);
/** When a conversation was last used: "Today, 09:54", "Yesterday, 14:10", else the date and time. */
function whenLabel(iso: string, ui: Lang): string {
  const t = createCopy[ui].interpret, d = new Date(iso), now = new Date();
  const time = formatDate(ui, d, { style: "time", zone: "local" });
  if (d.toDateString() === now.toDateString()) return `${t.today}, ${time}`;
  if (d.toDateString() === new Date(now.getTime() - 864e5).toDateString()) return `${t.yesterday}, ${time}`;
  return `${formatDate(ui, d, { style: d.getFullYear() === now.getFullYear() ? "dayMonth" : "day", zone: "local" })}, ${time}`;
}
