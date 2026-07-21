import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
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
