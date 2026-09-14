import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

// Pin the Turbopack root to this file's directory, not the launching shell's
// cwd. With `process.cwd()` any start from another directory (an IDE task, a
// parent folder) pointed Turbopack at the wrong root, where it could not
// resolve the `next` package and panicked on every HMR rebuild — which the
// browser recovered from by full-reloading in a loop.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  poweredByHeader: false,
  // Same policy as netlify.toml, for hosts that run `next start` and let it
  // serve public/ itself — there every file went out with `max-age=0`, so a
  // returning visitor re-validated the hero track and every image.
  async headers() {
    return [
      {
        source: "/media/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // The link-in-bio page is a self-contained static file in public/. Next
      // does not resolve directory indexes there, so /links would 404 and only
      // /links/index.html worked. This covers local dev; netlify.toml carries
      // the same rule for production, where public/ lives on the CDN instead of
      // in the function bundle.
      { source: "/links", destination: "/links/index.html" },
    ];
  },
  images: {
    // Optimisation was off because the source hosts were said to exceed the
    // optimizer's timeout. They no longer do — a sweep of the supplier images
    // resized in 0.5-1.7s each — and leaving it off was serving the browser
    // the untouched originals: one product photo alone was 19.4MB, and the
    // home page pulled 25MB on a phone.
    unoptimized: false,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "i.postimg.cc" },
      { protocol: "https", hostname: "s3.m-market.kg" },
    ],
  },
};

export default nextConfig;
