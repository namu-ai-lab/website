import { describe, expect, it } from "vitest";
import { checkServerEnv, envNotices, envProblems } from "./env-check";

const accounts = { DATABASE_URL: "postgres://x", NEON_AUTH_BASE_URL: "https://auth.example.org", NEON_AUTH_COOKIE_SECRET: "c".repeat(32), NAMU_KEY_PEPPER: "p".repeat(32) };

describe("server settings", () => {
  it("stops a production build on a feature set up in part", () => {
    expect(() => checkServerEnv({ DATABASE_URL: "postgres://x" }, { strict: true })).toThrow(/Accounts are half configured/);
    expect(() => checkServerEnv({ ...accounts, MODAL_PROXY_KEY: "k" }, { strict: true })).toThrow(/a pair/);
  });
  it("lets a half-set WhatsApp deploy, and says what it still needs", () => {
    const env = { ...accounts, WHATSAPP_TOKEN: "t", WHATSAPP_VERIFY_TOKEN: "v" };
    expect(envProblems(env)).toEqual([]);
    expect(envNotices(env)).toEqual(["WhatsApp stays off until WHATSAPP_APP_SECRET is set too."]);
    expect(() => checkServerEnv(env, { strict: true })).not.toThrow();
  });
  it("says nothing when WhatsApp is all set or not set", () => {
    expect(envNotices({ WHATSAPP_TOKEN: "t", WHATSAPP_VERIFY_TOKEN: "v", WHATSAPP_APP_SECRET: "s" })).toEqual([]);
    expect(envNotices({})).toEqual([]);
  });
});
