import { describe, expect, it } from "vitest";
import { langFromAcceptLanguage, lp, pickLang, switchPath } from "@/i18n/config";

describe("pickLang", () => {
  it("puts the visitor's own choice first", () => {
    expect(pickLang({ cookie: "en", country: "NE", acceptLanguage: "fr" })).toBe("en");
    expect(pickLang({ cookie: "fr", country: "US", acceptLanguage: "en" })).toBe("fr");
  });

  it("ignores a cookie that is not a language", () => {
    expect(pickLang({ cookie: "de", country: "NE" })).toBe("fr");
  });

  it("then the country: French-speaking countries get French, others English", () => {
    expect(pickLang({ country: "NE", acceptLanguage: "en" })).toBe("fr");
    expect(pickLang({ country: "NG", acceptLanguage: "fr" })).toBe("en");
  });

  it("lets the browser decide in bilingual countries", () => {
    expect(pickLang({ country: "CA", acceptLanguage: "fr-CA,fr;q=0.9,en;q=0.8" })).toBe("fr");
    expect(pickLang({ country: "CA", acceptLanguage: "en-CA" })).toBe("en");
    expect(pickLang({ country: "CA" })).toBe("en");
  });

  it("then the browser, then English", () => {
    expect(pickLang({ acceptLanguage: "fr-FR" })).toBe("fr");
    expect(pickLang({ acceptLanguage: "de-DE" })).toBe("en");
    expect(pickLang({})).toBe("en");
  });
});

describe("langFromAcceptLanguage", () => {
  it("takes the supported language with the highest quality", () => {
    expect(langFromAcceptLanguage("de;q=1, en;q=0.5, fr;q=0.8")).toBe("fr");
    expect(langFromAcceptLanguage("ha, de")).toBe(null);
    expect(langFromAcceptLanguage(null)).toBe(null);
  });
});

describe("lp", () => {
  it("leaves English paths plain and puts French under /fr", () => {
    expect(lp("en", "/research")).toBe("/research");
    expect(lp("fr", "/research")).toBe("/fr/research");
    expect(lp("fr", "/")).toBe("/fr");
    expect(lp("fr", "/#demo")).toBe("/fr#demo");
  });

  it("leaves external and protocol-relative links alone", () => {
    expect(lp("fr", "https://namu-ai.org")).toBe("https://namu-ai.org");
    expect(lp("fr", "//cdn.example.com/x")).toBe("//cdn.example.com/x");
    expect(lp("fr", "mailto:lab@namu-ai.org")).toBe("mailto:lab@namu-ai.org");
  });
});

describe("switchPath", () => {
  it("gives the same page in the other language", () => {
    expect(switchPath("/research", "fr")).toBe("/fr/research");
    expect(switchPath("/fr/research", "en")).toBe("/research");
    expect(switchPath("/fr", "en")).toBe("/");
    expect(switchPath("/en/about", "fr")).toBe("/fr/about");
    expect(switchPath("/", "fr")).toBe("/fr");
  });

  it("does not mistake a page that starts with fr for the French prefix", () => {
    expect(switchPath("/french-notes", "fr")).toBe("/fr/french-notes");
  });
});
