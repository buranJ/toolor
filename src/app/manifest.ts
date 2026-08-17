import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/config/site";

/**
 * Web app manifest. `start_url` stays unprefixed — the proxy sends it to the
 * visitor's locale, so an installed shortcut follows their language choice.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#00339f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
