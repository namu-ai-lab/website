// npm run aws:secrets [path/to/.env.local] — copies the gateway's secrets from .env.local into AWS Secrets Manager
// (namu/api/gateway, the AWS gateway in platform/aws), without printing them. Same values as `npm run modal:secrets`:
//   GATEWAY_DATABASE_URL, NAMU_KEY_PEPPER   always
//   MODAL_PROXY_KEY, MODAL_PROXY_SECRET     only when both are set; otherwise the stored pair is kept
// Running tasks read secrets when they start: aws ecs update-service --cluster namu-api --service namu-api --force-new-deployment
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { readEnv } from "./env-file.mjs";

const env = readEnv(process.argv[2] ? resolve(process.argv[2]) : undefined);
const SECRET = "namu/api/gateway";
const aws = (args, input) => spawnSync("aws", [...args, "--region", "us-east-1"], {
  input, encoding: "utf8", env: { ...process.env, AWS_PROFILE: process.env.AWS_PROFILE || "namu-owner", AWS_PAGER: "" },
});

const missing = ["GATEWAY_DATABASE_URL", "NAMU_KEY_PEPPER"].filter(k => !env[k]);
if (missing.length) { console.error(`missing ${missing.join(", ")} in .env.local; nothing was saved`); process.exit(1); }
if (!/^postgres(ql)?:\/\//.test(env.GATEWAY_DATABASE_URL)) { console.error("GATEWAY_DATABASE_URL is not a postgres URL; nothing was saved"); process.exit(1); }
if (!env.MODAL_PROXY_KEY !== !env.MODAL_PROXY_SECRET) { console.error("MODAL_PROXY_KEY and MODAL_PROXY_SECRET are a pair; nothing was saved"); process.exit(1); }

const current = aws(["secretsmanager", "get-secret-value", "--secret-id", SECRET, "--query", "SecretString", "--output", "text"]);
if (current.status !== 0) { console.error(`reading ${SECRET} failed: ${current.stderr.split("\n")[0]}`); process.exit(1); }
const fields = { ...JSON.parse(current.stdout), GATEWAY_DATABASE_URL: env.GATEWAY_DATABASE_URL, NAMU_KEY_PEPPER: env.NAMU_KEY_PEPPER };
if (env.MODAL_PROXY_KEY) Object.assign(fields, { MODAL_PROXY_KEY: env.MODAL_PROXY_KEY, MODAL_PROXY_SECRET: env.MODAL_PROXY_SECRET });

const put = aws(["secretsmanager", "put-secret-value", "--secret-id", SECRET, "--secret-string", "file:///dev/stdin"], JSON.stringify(fields));
if (put.status !== 0) { console.error(`saving ${SECRET} failed: ${put.stderr.split("\n")[0].replace(/postgres(ql)?:\/\/\S+/g, "<redacted>")}`); process.exit(1); }
console.log(`${SECRET}: saved (${Object.entries(fields).map(([k, v]) => `${k} ${v ? "set" : "empty"}`).join(", ")})`);
