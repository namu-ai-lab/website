import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { checkServerEnv } from "./src/lib/env-check";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lets a phone on the same Wi-Fi open the dev server (by the Mac's Bonjour name or its local address) with
  // scripts and hot reload working; Next blocks dev resources for other origins otherwise. Dev only.
  allowedDevOrigins: ["Mouhamads-MacBook-Pro-5.local", "*.local", "192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

/* Every time Next starts, the server settings are checked once (src/lib/env-check.ts). A production build or server
   stops on a setting that is there in part, so Vercel keeps the deployment that works; preview deployments and the
   dev server only report it. */
export default function config(phase: string): NextConfig {
  checkServerEnv(process.env, { strict: phase !== PHASE_DEVELOPMENT_SERVER && process.env.VERCEL_ENV !== "preview" });
  return nextConfig;
}
