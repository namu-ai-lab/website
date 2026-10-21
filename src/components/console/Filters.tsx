"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/* The console's filter bar (Logs, Usage): a segmented choice and a few selects, all kept in the address so a view can
   be bookmarked or shared. Changing a filter starts again from the newest rows. */
export type Choice = { value: string; label: string };

export function Filters({ seg, selects }: {
  seg?: { name: string; value: string; label: string; options: Choice[] };
  selects?: { name: string; value: string; label: string; options: Choice[] }[];
}) {
  const router = useRouter(), path = usePathname(), params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (name: string, value: string) => {
    const q = new URLSearchParams(params.toString());
    q.delete("before");
    if (value) q.set(name, value); else q.delete(name);
    start(() => router.push(`${path}${q.size ? `?${q}` : ""}`, { scroll: false }));
  };
  return (
    <div className="cx-filters" aria-busy={pending || undefined}>
      {seg && (
        <div className="cx-seg" role="radiogroup" aria-label={seg.label}>
          {seg.options.map(o => (
            <button key={o.value} type="button" role="radio" aria-checked={o.value === seg.value} onClick={() => set(seg.name, o.value)}>{o.label}</button>
          ))}
        </div>
      )}
      {selects?.map(s => (
        <label key={s.name} className="cx-select">
          <span className="sr-only">{s.label}</span>
          <select value={s.value} onChange={e => set(s.name, e.target.value)}>
            {s.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}
