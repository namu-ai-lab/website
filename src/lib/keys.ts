import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { KEY_PREFIX } from "./key-shape";

export * from "./key-shape";

/* Namu API keys: `namu_sk_` + 43 base62 characters (256 random bits). Only HMAC-SHA256(pepper, key) is stored;
   the gateway (platform/modal/namu_gateway.py, hash_key) computes the same digest with the same pepper.
   Server-only: client components import ./key-shape instead. */
const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function generateKey(): string {
  let n = BigInt(`0x${randomBytes(32).toString("hex")}`);
  let out = "";
  for (let i = 0; i < 43; i++) { out = B62[Number(n % 62n)] + out; n /= 62n; }   // 62^43 > 2^256: no bits lost
  return KEY_PREFIX + out;
}

export function hashKey(key: string): string {
  const pepper = process.env.NAMU_KEY_PEPPER;
  if (!pepper || pepper.length < 32) throw new Error("NAMU_KEY_PEPPER is missing or too short");
  return createHmac("sha256", pepper).update(key).digest("hex");
}

/** What the dashboard shows: enough to tell keys apart, far too little to use. */
export const displayPrefix = (key: string) => key.slice(0, KEY_PREFIX.length + 4);
