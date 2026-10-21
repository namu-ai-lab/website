// npm run env:init — creates the secrets that nobody has to type: the cookie secret and the key pepper.
// Existing values are kept (changing NAMU_KEY_PEPPER later would invalidate every API key).
import { randomBytes } from "node:crypto";
import { readEnv, writeEnv } from "./env-file.mjs";

const env = readEnv();
const add = {};
for (const name of ["NEON_AUTH_COOKIE_SECRET", "NAMU_KEY_PEPPER"]) if (!env[name]) add[name] = randomBytes(48).toString("base64url");
writeEnv(add);
console.log(Object.keys(add).length ? `added to .env.local: ${Object.keys(add).join(", ")}` : ".env.local already has them");
const missing = ["DATABASE_URL", "NEON_AUTH_BASE_URL"].filter(n => !env[n]);
if (missing.length) console.log(`still needed (paste them yourself): ${missing.join(", ")}`);
