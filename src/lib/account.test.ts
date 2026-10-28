import { describe, expect, it, vi } from "vitest";
import { nextPath } from "@/lib/account";

// Sign-in (Neon Auth) needs a Next.js request to run; the function tested here never calls it.
vi.mock("@/lib/auth", () => ({ currentUser: vi.fn() }));

/* After signing in, the visitor is sent to ?next=. Only a path on this site may pass; anything that could leave the
   site (another host, a scheme, an encoded or backslashed slash) falls back to the console. */
describe("nextPath", () => {
  it("keeps a path on this site", () => {
    expect(nextPath("en", "/account")).toBe("/account");
    expect(nextPath("fr", "/fr/account/keys")).toBe("/fr/account/keys");
  });

  it("falls back to the console in the reader's language", () => {
    expect(nextPath("en")).toBe("/account");
    expect(nextPath("fr")).toBe("/fr/account");
    expect(nextPath("en", "")).toBe("/account");
  });

  it.each([
    "//evil.com",
    "//evil.com/account",
    "/\\evil.com",
    "\\\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "/%2F%2Fevil.com",
    "/account?next=//evil.com",
    "account",
  ])("refuses %s", raw => {
    expect(nextPath("en", raw)).toBe("/account");
  });
});
