import type { NextRequest } from "next/server";
import { consoleCopy } from "@/content/console";
import { signedIn } from "@/lib/http";
import { RANGES, usageFor, type Range } from "@/lib/usage";

/* The Usage page's numbers as CSV, one row per day and group, for a spreadsheet. Only the signed-in user's rows. */
export const dynamic = "force-dynamic";

const cell = (v: string | number) => (typeof v === "number" ? String(v) : /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function GET(req: NextRequest) {
  const s = await signedIn(req, false);
  if (s.e) return s.e;
  const q = req.nextUrl.searchParams;
  const range: Range = RANGES.find(r => r === q.get("range")) ?? "month";
  const by = q.get("by") === "key" ? "key" : "model";
  const t = consoleCopy[q.get("lang") === "fr" ? "fr" : "en"];
  const data = await usageFor(s.user.id, range, by, { playground: t.usage.playground, deleted: t.usage.deleted });
  const name = (id: string) => { const g = data.groups.find(x => x.id === id); return g?.scope ? t.keys.models[g.scope].name : g?.label ?? id; };
  const lines = [["date", by, "requests"].join(",")];
  for (const d of [...data.daily].sort((a, b) => a.day.localeCompare(b.day) || name(a.group).localeCompare(name(b.group))))
    lines.push([d.day, cell(name(d.group)), d.requests].join(","));
  lines.push("", ["total", by, "requests", "errors", "audio_minutes", "characters", "average_latency_ms"].join(","));
  for (const r of data.totals)
    lines.push([`${data.from}..${data.to}`, cell(name(r.group)), r.requests, r.errors, r.audioMin.toFixed(2), r.chars, r.latencyMs === null ? "" : Math.round(r.latencyMs)].join(","));
  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="namu-usage-${data.from}-${data.to}-by-${by}.csv"`, "Cache-Control": "no-store" },
  });
}
