import { Pool } from "pg";

/* The Neon Postgres database, from the server only. Every query that touches a developer's data filters on
   their user id in SQL; nothing here is reachable from the browser. One pool per server instance, kept small:
   Neon's pooled endpoint (host with -pooler) does the real pooling. */
const g = globalThis as unknown as { namuPool?: Pool };

export function db(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  g.namuPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 30_000 });
  return g.namuPool;
}

/** One query, typed rows. */
export async function sql<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const { rows } = await db().query(text, params);
  return rows as T[];
}
