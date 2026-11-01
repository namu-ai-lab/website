import "server-only";
import { Pool } from "pg";
import { required } from "@/lib/env";

/* The Neon Postgres database, from the server only. Every query that touches a developer's data filters on
   their user id in SQL; nothing here is reachable from the browser. One pool per server instance, kept small:
   Neon's pooled endpoint (host with -pooler) does the real pooling. */
const g = globalThis as unknown as { namuPool?: Pool };

export function db(): Pool {
  const url = required("DATABASE_URL");
  g.namuPool ??= new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 30_000 });
  return g.namuPool;
}

/** One query, typed rows. */
export async function sql<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await db().query(text, params);
  return rows as T[];
}

/** Whether a query failed because its table does not exist yet: a migration that has not been applied to this
    database. Pages that read the platform's newer tables show "almost ready" instead of an error. */
export const isMissingTable = (e: unknown) => (e as { code?: string } | null)?.code === "42P01";

type Query = <T>(text: string, params?: unknown[]) => Promise<T[]>;
/** Several queries as one: all of them, or none. They share one connection, which a plain sql() call does not. */
export async function tx<T>(work: (q: Query) => Promise<T>): Promise<T> {
  const client = await db().connect();
  try {
    await client.query("begin");
    const out = await work(async <R,>(text: string, params: unknown[] = []) => (await client.query(text, params)).rows as R[]);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
