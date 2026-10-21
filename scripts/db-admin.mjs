// npm run db:admin -- you@example.org   makes an existing account an approved admin.
// npm run db:admin -- --demo            marks the key named "website demo" as the demo key.
import pg from "pg";
import { loadEnv } from "./env-file.mjs";

loadEnv();
const arg = process.argv[2];
if (!arg) { console.error("usage: npm run db:admin -- <email> | --demo"); process.exit(1); }
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  if (arg === "--demo") {
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
