import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "@/lib/db";
import { usageFor } from "@/lib/usage";

/* usageFor's SQL runs in Postgres; here a fake sql() records each query and answers with fixed rows, so the test
   checks the windows it asks for and what it builds from the answers, with no database. */
vi.mock("@/lib/db", () => ({ sql: vi.fn() }));

type Rows = { span: { f: string; t: string }; totals?: unknown[]; daily?: unknown[]; keys?: unknown[] };
const queries: string[] = [];

function answer(rows: Rows) {
  vi.mocked(sql).mockImplementation(async (text: string) => {
    queries.push(text);
    if (text.includes(" as f,")) return [rows.span] as never;
    if (text.includes(" as day,")) return (rows.daily ?? []) as never;
    if (text.includes("from public.api_keys where")) return (rows.keys ?? []) as never;
    return (rows.totals ?? []) as never;
  });
}

const names = { playground: "Playground", deleted: "Deleted key" };

beforeEach(() => { queries.length = 0; vi.mocked(sql).mockClear(); });
afterEach(() => { vi.unstubAllEnvs(); });

describe("usageFor windows", () => {
  it.each([
    ["month", "date_trunc('month', now())", "now()"],
    ["last", "date_trunc('month', now()) - interval '1 month'", "date_trunc('month', now())"],
    ["7d", "date_trunc('day', now()) - interval '6 days'", "now()"],
    ["30d", "date_trunc('day', now()) - interval '29 days'", "now()"],
  ] as const)("%s counts events from %s up to, not including, %s", async (range, from, to) => {
    answer({ span: { f: "2026-10-01", t: "2026-10-22" } });
    await usageFor("u1", range, "model", names);
    const totals = queries.find(q => q.includes("count(*) filter"));
    expect(totals).toContain(`e.created_at >= ${from} and e.created_at < ${to}`);
  });

  it("reads the period's first and last day in UTC", async () => {
    answer({ span: { f: "2026-09-01", t: "2026-09-30" } });
    await usageFor("u1", "last", "model", names);
    const span = queries.find(q => q.includes(" as f,"));
    expect(span).toContain("at time zone 'UTC'");
    expect(span).toContain("- interval '1 second'");     // the last day is the day before the window's end
  });

  it("lists every day of the period, across month and year ends, whatever the server's time zone", async () => {
    vi.stubEnv("TZ", "Pacific/Kiritimati");               // UTC+14: a local-time loop would be off by a day
    answer({ span: { f: "2025-12-26", t: "2026-01-01" } });
    const { from, to, days } = await usageFor("u1", "7d", "model", names);
    expect([from, to]).toEqual(["2025-12-26", "2026-01-01"]);
    expect(days).toEqual(["2025-12-26", "2025-12-27", "2025-12-28", "2025-12-29", "2025-12-30", "2025-12-31", "2026-01-01"]);
  });

  it("gives a whole month for the previous month", async () => {
    answer({ span: { f: "2024-02-01", t: "2024-02-29" } });
    const { days } = await usageFor("u1", "last", "model", names);
    expect(days).toHaveLength(29);
  });
});

describe("usageFor groups and totals", () => {
  it("by model: the four models, in order, with minutes from seconds", async () => {
    answer({
      span: { f: "2026-10-01", t: "2026-10-22" },
      totals: [{ grp: "transcribe", requests: 3, errors: 1, audio: "90", chars: 0, latency: "412.5" }],
    });
    const { groups, totals } = await usageFor("u1", "month", "model", names);
    expect(groups.map(g => g.id)).toEqual(["transcribe", "speech", "translate", "converse"]);
    expect(totals).toEqual([{ group: "transcribe", requests: 3, errors: 1, audioMin: 1.5, chars: 0, latencyMs: 412.5 }]);
  });

  it("by key: the keys that were used, then the Playground and deleted keys, in the reader's words", async () => {
    answer({
      span: { f: "2026-10-01", t: "2026-10-22" },
      totals: ["k2", "playground", "deleted"].map(grp => ({ grp, requests: 1, errors: 1, audio: "0", chars: 5, latency: null })),
      keys: [{ id: "k1", name: "Unused", prefix: "namu_sk_aaaa" }, { id: "k2", name: "Prod", prefix: "namu_sk_bbbb" }],
    });
    const { groups, totals } = await usageFor("u1", "month", "key", names);
    expect(groups).toEqual([
      { id: "k2", label: "Prod (namu_sk_bbbb…)" },
      { id: "playground", label: "Playground" },
      { id: "deleted", label: "Deleted key" },
    ]);
    expect(totals[0].latencyMs).toBeNull();               // no successful request: no latency, not zero
  });

  it("only ever reads the signed-in account's rows", async () => {
    answer({ span: { f: "2026-10-01", t: "2026-10-22" } });
    await usageFor("u1", "month", "key", names);
    const reads = vi.mocked(sql).mock.calls.filter(([text]) => !text.includes(" as f,"));
    expect(reads).toHaveLength(3);
    for (const [text, params] of reads) {
      expect(text).toMatch(/user_id = \$1/);
      expect(params).toEqual(["u1"]);
    }
  });
});
