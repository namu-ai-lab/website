import type { NextRequest } from "next/server";
import { fail } from "@/lib/http";

/* Where browsers send Content-Security-Policy violation reports (next.config.ts names this route in report-uri and
   in Reporting-Endpoints). Each violation becomes one log line starting "csp-violation", which Vercel's Logs tab
   shows; nothing is stored. Anyone can post here, so the route accepts small bodies only, logs a few short fields
   per report and never a query string or fragment (a page's address can carry a reset or sign-in token), and skips
   reports caused by browser extensions, which say nothing about the site. */
const MAX_BYTES = 16 * 1024;
const MAX_REPORTS = 10;
const EXTENSION = /^(chrome|moz|safari|safari-web|ms-browser)-extension:/;

/** A URL without its query and fragment, or a CSP keyword (inline, eval, data, blob) as is; cut short either way. */
function clean(v: unknown): string {
  if (typeof v !== "string") return "";
  try {
    const u = new URL(v);
    return (u.protocol === "http:" || u.protocol === "https:" ? `${u.origin}${u.pathname}` : u.protocol).slice(0, 200);
  } catch { return v.slice(0, 40); }
}

type Violation = { directive: string; blocked: string; page: string; source: string; line: number | null; disposition: string };

/** Reads either format: report-uri's { "csp-report": { ... } } or the Reporting API's [{ type, body: { ... } }]. */
function violations(json: unknown): Violation[] {
  const raw: Record<string, unknown>[] = Array.isArray(json)
    ? json.filter(r => r?.type === "csp-violation" && r.body && typeof r.body === "object").map(r => r.body)
    : json && typeof json === "object" && "csp-report" in json && typeof json["csp-report"] === "object" && json["csp-report"]
      ? [json["csp-report"] as Record<string, unknown>] : [];
  const out: Violation[] = [];
  for (const r of raw.slice(0, MAX_REPORTS)) {
    const blocked = r.blockedURL ?? r["blocked-uri"], source = r.sourceFile ?? r["source-file"];
    if ([blocked, source].some(v => typeof v === "string" && EXTENSION.test(v))) continue;
    const directive = String(r.effectiveDirective ?? r["effective-directive"] ?? r["violated-directive"] ?? "").split(" ")[0];
    if (!/^[a-z-]{1,40}$/.test(directive)) continue;
    const line = Number(r.lineNumber ?? r["line-number"]);
    out.push({ directive, blocked: clean(blocked), page: clean(r.documentURL ?? r["document-uri"]), source: clean(source),
      line: Number.isInteger(line) && line > 0 ? line : null, disposition: clean(r.disposition) });
  }
  return out;
}

export async function POST(req: NextRequest) {
  const type = req.headers.get("content-type") ?? "";
  if (!/^application\/(csp-report|reports\+json|json)\b/.test(type)) return fail(415, "unsupported_type", "Send a CSP report.");
  const length = Number(req.headers.get("content-length"));
  if (!length || length > MAX_BYTES) return fail(413, "too_large", "Reports are small.");
  let json: unknown;
  try { json = JSON.parse(await req.text()); } catch { return fail(400, "bad_json", "Send a CSP report."); }
  for (const v of violations(json)) console.warn(`csp-violation ${JSON.stringify(v)}`);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
