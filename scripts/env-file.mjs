// Tiny helpers for .env.local, shared by the setup scripts. They never print a value, only names.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const ENV_FILE = new URL("../.env.local", import.meta.url);

export function readEnv() {
  if (!existsSync(ENV_FILE)) return {};
  const out = {};
  for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  }
  return out;
}

/** Sets or replaces NAME=value lines, keeping every other line as it was. */
export function writeEnv(values) {
  const lines = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8").split(/\r?\n/).filter(l => l !== "") : [];
  for (const [k, v] of Object.entries(values)) {
    const i = lines.findIndex(l => l.startsWith(`${k}=`));
    if (i >= 0) lines[i] = `${k}=${v}`; else lines.push(`${k}=${v}`);
  }
  writeFileSync(ENV_FILE, lines.join("\n") + "\n");
}

/** Loads .env.local into process.env without overriding what the shell already set. */
export function loadEnv() {
  for (const [k, v] of Object.entries(readEnv())) process.env[k] ??= v;
}
