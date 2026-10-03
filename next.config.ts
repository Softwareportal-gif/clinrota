import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Service worker caching is unreliable under `next dev` (hot-reload
  // fights the cache) — disable it there entirely and only run it against
  // production builds, per the plan agreed for this phase.
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Room for a MAX_UPLOAD_MB (4MB) file plus multipart overhead, while
      // staying under Vercel's ~4.5MB function request-body limit.
      bodySizeLimit: "4.4mb",
    },
  },
};

export default withSerwist(nextConfig);
