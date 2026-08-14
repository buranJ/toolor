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
  images: {
    // Source hosts intermittently exceed Next's optimizer timeout; use the exact
    // validated workbook URLs in the browser instead of proxying their bytes.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "i.postimg.cc" },
      { protocol: "https", hostname: "s3.m-market.kg" },
    ],
  },
};

export default nextConfig;
