import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { sameOrigin } from "@/lib/http";

// Sign-in (Neon Auth) needs a Next.js request to run; the function tested here never calls it.
vi.mock("@/lib/auth", () => ({ currentUser: vi.fn() }));

const request = (headers: Record<string, string>) =>
  new NextRequest("https://www.namuai-lab.com/api/keys", { method: "POST", headers });

/* Requests that change state (create or revoke a key, save a profile) must come from this site's own pages. */
describe("sameOrigin", () => {
  it("accepts a request whose Origin is this host", () => {
    expect(sameOrigin(request({ origin: "https://www.namuai-lab.com", host: "www.namuai-lab.com" }))).toBe(true);
    expect(sameOrigin(request({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
  });

  it("refuses another origin, a look-alike host, or no Origin at all", () => {
    expect(sameOrigin(request({ origin: "https://evil.com", host: "www.namuai-lab.com" }))).toBe(false);
    expect(sameOrigin(request({ origin: "https://www.namuai-lab.com.evil.com", host: "www.namuai-lab.com" }))).toBe(false);
    expect(sameOrigin(request({ origin: "http://localhost:4000", host: "localhost:3000" }))).toBe(false);
    expect(sameOrigin(request({ host: "www.namuai-lab.com" }))).toBe(false);
    expect(sameOrigin(request({ origin: "null", host: "www.namuai-lab.com" }))).toBe(false);
  });
});
