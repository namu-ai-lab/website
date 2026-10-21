// npm run db:migrate — sets up the Neon database. Safe to run again.
//   1. checks that Neon Auth is switched on (its neon_auth schema holds the users; Neon creates it)
//   2. the gateway's login role, namu_gateway, with a generated password (saved to .env.local as
//      GATEWAY_DATABASE_URL, never printed)
//   3. db/migrations/*.sql in order
import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import pg from "pg";
import { loadEnv, readEnv, writeEnv } from "./env-file.mjs";

loadEnv();
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is missing (put it in .env.local)"); process.exit(1); }
const pool = new pg.Pool({ connectionString: url, max: 1 });

try {
  const users = await pool.query(`select to_regclass('neon_auth."user"') is not null as ok`);
  if (!users.rows[0].ok) console.warn("neon_auth.\"user\" not found: switch on Neon Auth for this branch (Neon Console → Auth) before signing in");

  const role = await pool.query("select 1 from pg_roles where rolname = 'namu_gateway'");
  if (!role.rowCount || !readEnv().GATEWAY_DATABASE_URL) {
    const password = randomBytes(32).toString("base64url");          // [A-Za-z0-9_-] only: safe inline
    await pool.query(role.rowCount
      ? `alter role namu_gateway with login password '${password}'`
      : `create role namu_gateway with login password '${password}'`);
    const g = new URL(url);
    g.username = "namu_gateway"; g.password = password;
    writeEnv({ GATEWAY_DATABASE_URL: g.toString() });
    console.log("gateway role ready; GATEWAY_DATABASE_URL saved to .env.local");
  }

  const dir = new URL("../db/migrations/", import.meta.url);
  for (const f of readdirSync(dir).filter(f => f.endsWith(".sql")).sort()) {
    await pool.query(readFileSync(new URL(f, dir), "utf8"));
    console.log(`applied ${f}`);
  }
} catch (e) {
  console.error(`migration failed: ${e.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
