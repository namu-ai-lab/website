import type { NextConfig } from "next";

const dev = process.env.NODE_ENV === "development";
const preview = process.env.VERCEL_ENV === "preview";

/* The Content-Security-Policy: every place the browser may load from, by kind. It lists exactly what the site
   loads today:
   - the site itself: pages, scripts, styles, the fonts in public/fonts, images (next/image is same-origin), the
     audio samples, and every fetch (the demos, the console and Neon Auth all call this site's own /api routes);
   - Vercel Web Analytics and Speed Insights: same-origin in production (a project-specific path on this domain),
     va.vercel-scripts.com in development;
   - Tally: its widget script, and the form it opens in an iframe on tally.so;
   - blob: for recorded and returned audio and for the microphone's AudioWorklet module (a worklet is a script);
     data: for the CSS grain textures;
   - the Vercel Toolbar on preview deployments only (vercel.com/docs/vercel-toolbar/managing-toolbar).
   'unsafe-inline' scripts are needed because Next streams each page's data in inline scripts and every page here
   is static, so there is no per-request nonce; the policy still pins every host scripts, frames and requests can
   reach. 'unsafe-eval' is for development only: React's development build of server components calls eval.
   It ships as Content-Security-Policy-Report-Only: violations are reported to /api/csp-report, nothing is blocked.
   frame-ancestors is also sent enforced, on its own, because framing must be refused now. */
const csp: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", "blob:", "https://tally.so/widgets/embed.js",
    ...(dev ? ["'unsafe-eval'", "https://va.vercel-scripts.com"] : []), ...(preview ? ["https://vercel.live"] : [])],
  "style-src": ["'self'", "'unsafe-inline'", ...(preview ? ["https://vercel.live"] : [])],
  "img-src": ["'self'", "data:", "blob:", ...(preview ? ["https://vercel.live", "https://vercel.com"] : [])],
  "font-src": ["'self'", ...(preview ? ["https://vercel.live", "https://assets.vercel.com"] : [])],
  "media-src": ["'self'", "blob:"],
  "connect-src": ["'self'", ...(preview ? ["https://vercel.live", "wss://ws-us3.pusher.com"] : [])],
  "frame-src": ["https://tally.so", ...(preview ? ["https://vercel.live"] : [])],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'none'"],
  "report-uri": ["/api/csp-report"],
  "report-to": ["csp"],
};
const policy = Object.entries(csp).map(([k, v]) => `${k} ${v.join(" ")}`).join("; ");

/* Sent with every response: pages, API routes and static files. HSTS comes from Vercel (max-age two years). */
const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: policy },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Reporting-Endpoints", value: `csp="/api/csp-report"` },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The demos record from the microphone on this site; nothing else here, and no embedded frame, uses a device.
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), display-capture=(), usb=(), serial=(), hid=(), bluetooth=(), midi=(), payment=(), accelerometer=(), gyroscope=(), magnetometer=(), browsing-topics=()" },
  // Tally opens in an iframe and sign-in redirects, so no window this site opens needs a handle back to it.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lets a phone on the same Wi-Fi open the dev server (by the Mac's Bonjour name or its local address) with
  // scripts and hot reload working; Next blocks dev resources for other origins otherwise. Dev only.
  allowedDevOrigins: ["Mouhamads-MacBook-Pro-5.local", "*.local", "192.168.*.*", "10.*.*.*", "172.*.*.*"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
