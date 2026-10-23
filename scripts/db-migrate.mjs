// npm run db:migrate — sets up the Neon database. Safe to run again.
//   1. checks that Neon Auth is switched on (its neon_auth schema holds the users; Neon creates it)
//   2. db/migrations/*.sql in order, each one once. A file runs inside a transaction, so it applies whole or not at
//      all, and is recorded in public.schema_migrations with a checksum of its text. A recorded file never runs
//      again, and one whose text has changed since is refused before anything is written: fix forward, in a new file.
//   3. the gateway's login role, namu_gateway, with a generated password (saved to .env.local as
//      GATEWAY_DATABASE_URL, never printed)
//   4. db/gateway-grants.sql, on every run: what namu_gateway may do.
// npm run db:migrate -- --dry-run   says what would happen, and changes nothing.
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import pg from "pg";
import { loadEnv, readEnv, writeEnv } from "./env-file.mjs";

// Before the ledger, every migrate re-ran every file, so a database migrated then already holds these. The first
// ledger run records them as applied without running them again, once it has checked that the newest took effect.
const BEFORE_LEDGER = ["0001_namu_api.sql", "0002_neon_auth.sql", "0003_open_access.sql", "0004_service_key.sql"];
// Taken at the start of every write transaction, so two runs at once apply each file once, one after the other.
// Transaction-scoped, so it also holds through Neon's pooled (PgBouncer) endpoint.
const LOCK = "select pg_advisory_xact_lock(4851923)";

// `npm run db:migrate --dry-run` (without the `--`) hands the flag to npm, not to this script: honour both.
const dryRun = process.argv.includes("--dry-run") || process.env.npm_config_dry_run === "true";
loadEnv();
const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL is missing (put it in .env.local)"); process.exit(1); }
const pool = new pg.Pool({ connectionString: url, max: 1 });
const DB_DIR = new URL("../db/", import.meta.url);
const MIGRATIONS = new URL("migrations/", DB_DIR);
// A byte-order mark is dropped (Postgres would reject it), and line endings are normalised for the checksum, so a
// Windows checkout does not look like an edited file.
const read = (f, base = MIGRATIONS) => readFileSync(new URL(f, base), "utf8").replace(/^﻿/, "");
const checksum = text => createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
const yes = async (db, sql) => (await db.query(`select (${sql}) as ok`)).rows[0].ok;
const record = (f, sum) => ["insert into public.schema_migrations (filename, checksum) values ($1, $2)", [f, sum]];

/** Runs `work` in one transaction, under the migration lock: all of it, or none. */
async function locked(db, work) {
  await db.query("begin");
  try {
    await db.query(LOCK);
    const out = await work();
    await db.query("commit");
    return out;
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}

/** filename -> checksum of every migration already applied to this database. */
async function appliedMigrations(db) {
  if (!(await yes(db, "to_regclass('public.schema_migrations') is not null"))) return new Map();
  const rows = (await db.query("select filename, checksum from public.schema_migrations")).rows;
  return new Map(rows.map(r => [r.filename, r.checksum]));
}

/** The files to record without running: BEFORE_LEDGER on a database migrated before the ledger, else none. */
async function beforeLedger(db, applied) {
  if (applied.size || !(await yes(db, "to_regclass('public.api_keys') is not null"))) return [];
  if (!(await yes(db, "to_regprocedure('public.namu_key_lookup_v2(text)') is not null")))
    throw new Error("this database has Namu's tables but not 0004_service_key.sql (no namu_key_lookup_v2). "
      + "Apply the files up to 0004 by hand, check them, then run db:migrate again.");
  return BEFORE_LEDGER;
}

/** Applies one file and records it, unless a run alongside this one got there first. */
async function apply(db, f) {
  const done = await locked(db, async () => {
    if ((await db.query("select 1 from public.schema_migrations where filename = $1", [f])).rowCount) return true;
    await db.query(read(f));                   // no parameters: the simple protocol, so a file may hold many statements
    await db.query(...record(f, checksum(read(f))));
    return false;
  }).catch(e => { throw new Error(`${f} was not applied (rolled back): ${e.message}`); });
  console.log(done ? `${f} was applied by another run` : `applied ${f}`);
}

async function gatewayRole(db) {
  const role = await db.query("select 1 from pg_roles where rolname = 'namu_gateway'");
  if (role.rowCount && readEnv().GATEWAY_DATABASE_URL) return;
  if (dryRun) { console.log("would set up the namu_gateway role and save GATEWAY_DATABASE_URL"); return; }
  const password = randomBytes(32).toString("base64url");          // [A-Za-z0-9_-] only: safe inline
  await db.query(role.rowCount
    ? `alter role namu_gateway with login password '${password}'`
    : `create role namu_gateway with login password '${password}'`);
  const g = new URL(url);
  g.username = "namu_gateway"; g.password = password;
  writeEnv({ GATEWAY_DATABASE_URL: g.toString() });
  console.log("gateway role ready; GATEWAY_DATABASE_URL saved to .env.local");
}

const db = await pool.connect();
try {
  if (!(await yes(db, `to_regclass('neon_auth."user"') is not null`)))
    console.warn("neon_auth.\"user\" not found: switch on Neon Auth for this branch (Neon Console → Auth) before signing in");

  // Read and check everything first; nothing is written until it all holds.
  const applied = await appliedMigrations(db);
  const baseline = await beforeLedger(db, applied);
  for (const f of baseline) applied.set(f, checksum(read(f)));
  const files = readdirSync(MIGRATIONS).filter(f => f.endsWith(".sql")).sort();
  const changed = files.filter(f => applied.has(f) && applied.get(f) !== checksum(read(f)));
  if (changed.length) throw new Error(`${changed.join(", ")} changed after being applied. Put the change in a new migration.`);
  const pending = files.filter(f => !applied.has(f));

  if (dryRun) {
    if (baseline.length) console.log(`would record ${baseline.join(", ")} as applied before the ledger`);
    for (const f of pending) console.log(`pending ${f}`);
  } else {
    await locked(db, () => db.query(`create table if not exists public.schema_migrations (
      filename   text primary key,
      checksum   text not null,                  -- sha256 of the file, line endings normalised
      applied_at timestamptz not null default now()
    )`));
    if (baseline.length) {
      const fresh = await locked(db, async () => {
        if ((await db.query("select 1 from public.schema_migrations limit 1")).rowCount) return false;
        for (const f of baseline) await db.query(...record(f, applied.get(f)));
        return true;
      });
      if (fresh) console.log(`recorded ${baseline.join(", ")} as applied before the ledger`);
    }
    for (const f of pending) await apply(db, f);
  }
  if (!pending.length) console.log("no migrations pending");
  await gatewayRole(db);
  if (!dryRun) await locked(db, () => db.query(read("gateway-grants.sql", DB_DIR)));
} catch (e) {
  console.error(`migration failed: ${e.message}`);
  process.exitCode = 1;
} finally {
  db.release();
  await pool.end();
}
