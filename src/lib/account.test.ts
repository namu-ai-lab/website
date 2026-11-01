import { describe, expect, it, vi } from "vitest";
import { nextPath } from "@/lib/account";

// Sign-in (Neon Auth) needs a Next.js request to run; the function tested here never calls it.
vi.mock("@/lib/auth", () => ({ currentUser: vi.fn() }));

/* After signing in, the visitor is sent to ?next=. Only a path on this site may pass; anything that could leave the
   site (another host, a scheme, an encoded or backslashed slash) falls back to Namu Create, the platform's first door. */
describe("nextPath", () => {
  it("keeps a path on this site, with a plain query", () => {
    expect(nextPath("en", "/account")).toBe("/account");
    expect(nextPath("fr", "/fr/account/keys")).toBe("/fr/account/keys");
    expect(nextPath("en", "/account/keys?create=1")).toBe("/account/keys?create=1");
  });

  it("falls back to Namu Create in the reader's language", () => {
    expect(nextPath("en")).toBe("/create");
    expect(nextPath("fr")).toBe("/fr/create");
    expect(nextPath("en", "")).toBe("/create");
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
    "/account?next=/x",
    "/account?a=b#c",
  ])("refuses %s", raw => {
    expect(nextPath("en", raw)).toBe("/create");
  });
});
