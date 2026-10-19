import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lets a phone on the same Wi-Fi open the dev server (by the Mac's Bonjour name or its local address) with
  // scripts and hot reload working; Next blocks dev resources for other origins otherwise. Dev only.
  allowedDevOrigins: ["Mouhamads-MacBook-Pro-5.local", "*.local", "192.168.*.*", "10.*.*.*", "172.*.*.*"],
};

export default nextConfig;
