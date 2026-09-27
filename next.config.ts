import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Writers upload podcast audio through a form (Server Action). Default limit is 1 MB.
    serverActions: { bodySizeLimit: "26mb" },
  },
  // The service worker must never be cached, so updates reach users right away.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
