import { NextResponse, type NextRequest } from "next/server";
import { profileOf } from "@/lib/account";
import { sql } from "@/lib/db";
import { KEY_COLUMNS as COLUMNS, MAX_ACTIVE_KEYS, displayPrefix, generateKey, hashKey, isScopeList, type KeyRow } from "@/lib/keys";
import { fail, signedIn } from "@/lib/http";

/* The dashboard's key operations. Keys are minted here, on the server: the browser sees the secret once,
   in this response, and the database only ever sees its HMAC. Every statement is scoped to the caller. */
export const dynamic = "force-dynamic";
const noStore = { headers: { "Cache-Control": "no-store" } };

export async function GET(req: NextRequest) {
  const s = await signedIn(req, false);
  if (s.e) return s.e;
  const data = await sql<KeyRow>(`select ${COLUMNS} from public.api_keys where user_id = $1 order by created_at desc`, [s.user.id]);
  return NextResponse.json({ data }, noStore);
}

export async function POST(req: NextRequest) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const body = await req.json().catch(() => null) as { name?: unknown; scopes?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  if (!name) return fail(400, "missing_name", "Give the key a name.");
  if (!isScopeList(body?.scopes)) return fail(400, "bad_scopes", "Pick at least one model.");
  const scopes = [...new Set(body.scopes)];

  if ((await profileOf(s.user.id)).beta_status !== "approved") return fail(403, "account_paused", "This account is paused.");
  const [{ n }] = await sql<{ n: number }>("select count(*)::int as n from public.api_keys where user_id = $1 and revoked_at is null", [s.user.id]);
  if (n >= MAX_ACTIVE_KEYS) return fail(409, "too_many_keys", `Revoke a key first: ${MAX_ACTIVE_KEYS} active keys at most.`);

  const key = generateKey();
  const [data] = await sql<KeyRow>(
    `insert into public.api_keys (user_id, name, prefix, key_hash, scopes) values ($1, $2, $3, $4, $5) returning ${COLUMNS}`,
    [s.user.id, name, displayPrefix(key), hashKey(key), scopes]);
  return NextResponse.json({ key, data }, { status: 201, ...noStore });
}

export async function DELETE(req: NextRequest) {
  const s = await signedIn(req, true);
  if (s.e) return s.e;
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail(400, "bad_id", "Unknown key.");
  // Scoped to the caller: one account can never revoke another's key, even with its id.
  const [data] = await sql<KeyRow>(
    `update public.api_keys set revoked_at = now() where id = $1 and user_id = $2 and revoked_at is null returning ${COLUMNS}`,
    [id, s.user.id]);
  if (!data) return fail(404, "not_found", "Unknown key.");
  return NextResponse.json({ data }, noStore);
}
