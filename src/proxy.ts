import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, countryFrom, pickLang } from "@/i18n/config";
import { hasAccounts } from "@/lib/env";

/* Back from Google or GitHub, Neon Auth adds a one-time verifier to the page's address; it is swapped here for the
   session cookie, before the page renders, and the visitor lands on the same address without it. */
const VERIFIER = "neon_auth_session_verifier";

/* Language routing for the Lab site (Next 16 Proxy, formerly Middleware).
   - /fr/...           French, served as is.
   - /en/...           redirected to the plain URL, which is English's public address.
   - anything else     a visitor whose choice, country or browser points to French is redirected to /fr/...;
                       everyone else is served English (rewritten internally to /en/...).
   The country comes from the host's geolocation header (Vercel, Cloudflare, AWS, Netlify, Fastly).
   Nothing is stored: no IP address, no third-party lookup. In development, ?country=NE simulates a country. */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (searchParams.has(VERIFIER) && hasAccounts()) {
    const { auth } = await import("@/lib/auth");
    const login = pathname === "/fr" || pathname.startsWith("/fr/") ? "/fr/login" : "/login";
    const res = await auth().middleware({ loginUrl: `${login}?error=1` })(request);
    if (res.headers.has("location")) return res;       // signed in, or the exchange failed and sign-in says so
  }

  if (pathname === "/fr" || pathname.startsWith("/fr/")) return NextResponse.next();

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/en/, "") || "/";
    return NextResponse.redirect(url, 308);
  }

  const simulated = process.env.NODE_ENV !== "production" ? searchParams.get("country") : null;
  const lang = pickLang({
    cookie: request.cookies.get(LANG_COOKIE)?.value,
    country: simulated?.toUpperCase() ?? countryFrom(request.headers),
    acceptLanguage: request.headers.get("accept-language"),
  });

  if (lang === "fr") {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/fr" : `/fr${pathname}`;
    url.searchParams.delete("country");
    const res = NextResponse.redirect(url, 307);       // temporary: the answer depends on the visitor
    res.headers.set("Vary", "Accept-Language, Cookie");
    return res;
  }

  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname === "/" ? "" : pathname}`;
  const res = NextResponse.rewrite(url);
  res.headers.set("Vary", "Accept-Language, Cookie");
  return res;
}

export const config = {
  // Every page path; not Next's own assets, API routes or files with an extension (fonts, images, robots.txt).
  matcher: ["/((?!_next/|api/|.*\\.[a-zA-Z0-9]+$).*)"],
};
