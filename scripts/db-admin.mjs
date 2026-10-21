// npm run db:admin -- you@example.org   makes an existing account an approved admin.
// npm run db:admin -- --demo            marks the key named "website demo" as the demo key.
// npm run db:admin -- --service         creates the website's service key (the console Playground) and saves it
//                                       to .env.local as NAMU_SERVICE_KEY, never printed. Set the same in Vercel.
import { createHmac, randomBytes } from "node:crypto";
import pg from "pg";
import { loadEnv, writeEnv } from "./env-file.mjs";

loadEnv();
const arg = process.argv[2];
if (!arg) { console.error("usage: npm run db:admin -- <email> | --demo | --service"); process.exit(1); }
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  if (arg === "--service") {
    // The same key shape and fingerprint as src/lib/keys.ts: namu_sk_ + 43 base62 characters, HMAC-SHA256 with the pepper.
    const pepper = process.env.NAMU_KEY_PEPPER;
    if (!pepper || pepper.length < 32) throw new Error("NAMU_KEY_PEPPER is missing from .env.local");
    const live = await pool.query("select 1 from public.api_keys where is_service and revoked_at is null");
    if (live.rowCount) { console.log("an active service key already exists; revoke it first to make a new one"); process.exit(0); }
    const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let n = BigInt(`0x${randomBytes(32).toString("hex")}`), body = "";
    for (let i = 0; i < 43; i++) { body = B62[Number(n % 62n)] + body; n /= 62n; }
    const key = "namu_sk_" + body;
    await pool.query(`insert into public.profiles (user_id, beta_status, role, use_case) values ('namu-website', 'approved', 'user', 'The website''s own keys')
      on conflict (user_id) do nothing`);
    await pool.query(`insert into public.api_keys (user_id, name, prefix, key_hash, scopes, is_service)
      values ('namu-website', 'Playground', $1, $2, array['transcribe','speech','translate','converse'], true)`,
      [key.slice(0, 12), createHmac("sha256", pepper).update(key).digest("hex")]);
    writeEnv({ NAMU_SERVICE_KEY: key });
    console.log("service key created and saved to .env.local as NAMU_SERVICE_KEY");
  } else if (arg === "--demo") {
    const r = await pool.query(`update public.api_keys set is_demo = true, scopes = array['transcribe','speech','translate']
      where name = 'website demo' and revoked_at is null`);
    console.log(r.rowCount ? "demo key marked" : "no active key named 'website demo' yet: create it in /account/keys first");
  } else {
    await pool.query(`insert into public.profiles (user_id) select id::text from neon_auth."user" where lower(email) = lower($1)
      on conflict (user_id) do nothing`, [arg]);
    const r = await pool.query(`update public.profiles p set role = 'admin', beta_status = 'approved', reviewed_at = now()
      from neon_auth."user" u where u.id::text = p.user_id and lower(u.email) = lower($1)`, [arg]);
    console.log(r.rowCount ? `${arg} is now an approved admin` : `no account with that email yet: sign up on the site first`);
  }
} finally {
  await pool.end();
}
