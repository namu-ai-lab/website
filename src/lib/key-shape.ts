/* Key facts shared by the server routes and the dashboard (browser-safe: no crypto here). */
export const KEY_PREFIX = "namu_sk_";
export const SCOPES = ["transcribe", "speech", "translate", "converse"] as const;
export type Scope = (typeof SCOPES)[number];
export const MAX_ACTIVE_KEYS = 10;

export const isScopeList = (x: unknown): x is Scope[] =>
  Array.isArray(x) && x.length > 0 && x.length <= SCOPES.length && x.every(s => (SCOPES as readonly string[]).includes(s));

/** The api_keys columns signed-in roles may read (the migration withholds key_hash). */
export const KEY_COLUMNS = "id, name, prefix, scopes, is_demo, created_at, last_used_at, revoked_at";
/** A key as the browser holds it, on the keys page and from /api/keys: its times as ISO strings. */
export type KeyRow = { id: string; name: string; prefix: string; scopes: Scope[]; is_demo: boolean; created_at: string; last_used_at: string | null; revoked_at: string | null };
/** The same row as the database driver returns it: pg reads timestamptz as Date. keyRow() turns one into the other,
    so a page and a JSON response hand the browser the same shape. */
export type KeyRecord = Omit<KeyRow, "created_at" | "last_used_at" | "revoked_at"> & { created_at: Date; last_used_at: Date | null; revoked_at: Date | null };
export const keyRow = (r: KeyRecord): KeyRow =>
  ({ ...r, created_at: r.created_at.toISOString(), last_used_at: r.last_used_at?.toISOString() ?? null, revoked_at: r.revoked_at?.toISOString() ?? null });
