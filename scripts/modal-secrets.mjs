// npm run modal:secrets — copies the gateway's secrets from .env.local into Modal, without printing them.
//   namu-db          GATEWAY_DATABASE_URL (the namu_gateway role: can only call the two key functions)
//   namu-key-pepper  NAMU_KEY_PEPPER (must match the website's)
import { spawnSync } from "node:child_process";
import { readEnv } from "./env-file.mjs";

const env = readEnv();
const modal = process.env.MODAL_BIN || "modal";
const secrets = { "namu-db": ["GATEWAY_DATABASE_URL"], "namu-key-pepper": ["NAMU_KEY_PEPPER"] };
for (const [name, keys] of Object.entries(secrets)) {
  const missing = keys.filter(k => !env[k]);
  if (missing.length) { console.error(`${name}: missing ${missing.join(", ")} in .env.local`); process.exitCode = 1; continue; }
  const r = spawnSync(modal, ["secret", "create", name, ...keys.map(k => `${k}=${env[k]}`), "--force"], { stdio: ["ignore", "ignore", "pipe"] });
  console.log(r.status === 0 ? `modal secret ${name}: saved` : `modal secret ${name}: failed (${String(r.stderr).split("\n")[0].replace(/postgres(ql)?:\/\/\S+/g, "<redacted>")})`);
}
