import { afterEach, describe, expect, it, vi } from "vitest";
import { KEY_PREFIX, SCOPES, displayPrefix, generateKey, hashKey, isScopeList } from "@/lib/keys";

afterEach(() => { vi.unstubAllEnvs(); });

describe("generateKey", () => {
  it("is namu_sk_ and 43 base62 characters", () => {
    expect(generateKey()).toMatch(/^namu_sk_[0-9A-Za-z]{43}$/);
  });

  it("never repeats", () => {
    const keys = new Set(Array.from({ length: 100 }, generateKey));
    expect(keys.size).toBe(100);
  });
});

describe("hashKey", () => {
  /* The gateway hashes every presented key the same way (platform/modal/namu_gateway.py, hash_key), and
     platform/tests/test_gateway.py asserts this same vector. If the two ever disagree, every key the website
     issues is rejected by the API. */
  it("matches the gateway's vector", () => {
    vi.stubEnv("NAMU_KEY_PEPPER", "0123456789abcdef0123456789abcdef");
    expect(hashKey(`namu_sk_${"A".repeat(43)}`)).toBe("9c07945d58ba81849eb9033b10c0b75f7b82d676e715d4763e5089231ff94e5d");
  });

  it("refuses to run without a pepper of 32 characters or more", () => {
    vi.stubEnv("NAMU_KEY_PEPPER", "");
    expect(() => hashKey("namu_sk_x")).toThrow(/NAMU_KEY_PEPPER/);
    vi.stubEnv("NAMU_KEY_PEPPER", "a".repeat(31));
    expect(() => hashKey("namu_sk_x")).toThrow(/NAMU_KEY_PEPPER/);
  });
});

describe("displayPrefix", () => {
  it("shows the prefix and four characters, never the key", () => {
    expect(displayPrefix("namu_sk_AbCdEfGh")).toBe("namu_sk_AbCd");
    expect(displayPrefix(generateKey())).toHaveLength(KEY_PREFIX.length + 4);
  });
});

describe("isScopeList", () => {
  it("accepts one or more known scopes", () => {
    expect(isScopeList(["transcribe"])).toBe(true);
    expect(isScopeList([...SCOPES])).toBe(true);
  });

  it("rejects an empty list, unknown scopes and anything that is not a list", () => {
    expect(isScopeList([])).toBe(false);
    expect(isScopeList(["transcribe", "admin"])).toBe(false);
    expect(isScopeList([...SCOPES, "speech"])).toBe(false);      // longer than the scope list
    expect(isScopeList("transcribe")).toBe(false);
    expect(isScopeList(null)).toBe(false);
    expect(isScopeList([1])).toBe(false);
  });
});
