import { describe, expect, it } from "vitest";
import { redactUrl } from "@/lib/analytics";

/* Every URL is cut down before it reaches the analytics: a password-reset token or a sign-in callback must never
   leave the browser. */
describe("redactUrl", () => {
  it("drops every query parameter but the campaign tags, and the fragment", () => {
    expect(redactUrl("https://www.namuai-lab.com/reset-password?token=secret#top"))
      .toBe("https://www.namuai-lab.com/reset-password");
    expect(redactUrl("https://www.namuai-lab.com/?neon_auth_session_verifier=abc&utm_source=x&utm_medium=email"))
      .toBe("https://www.namuai-lab.com/?utm_source=x&utm_medium=email");
  });

  it("keeps only the five utm_ tags it knows", () => {
    expect(redactUrl("https://www.namuai-lab.com/api?utm_campaign=launch&utm_id=7&utm_term=asr"))
      .toBe("https://www.namuai-lab.com/api?utm_campaign=launch&utm_term=asr");
  });
});
