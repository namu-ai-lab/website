/* Key facts shared by the server routes and the dashboard (browser-safe: no crypto here). */
export const KEY_PREFIX = "namu_sk_";
export const SCOPES = ["transcribe", "speech", "translate", "converse"] as const;
export type Scope = (typeof SCOPES)[number];
export const MAX_ACTIVE_KEYS = 10;

export const isScopeList = (x: unknown): x is Scope[] =>
  Array.isArray(x) && x.length > 0 && x.length <= SCOPES.length && x.every(s => (SCOPES as readonly string[]).includes(s));

/** The api_keys columns signed-in roles may read (the migration withholds key_hash). */
export const KEY_COLUMNS = "id, name, prefix, scopes, is_demo, created_at, last_used_at, revoked_at";
export type KeyRow = { id: string; name: string; prefix: string; scopes: Scope[]; is_demo: boolean; created_at: string; last_used_at: string | null; revoked_at: string | null };
