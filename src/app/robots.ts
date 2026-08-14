import type { MetadataRoute } from "next";

import { locales } from "@/i18n";
import { siteConfig } from "@/lib/config/site";

/** Private routes exist under every locale prefix, so disallow each variant. */
const PRIVATE_ROUTES = [
  "/account/",
  "/cart",
  "/checkout",
  "/wishlist",
  "/search",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: locales.flatMap((locale) =>
        PRIVATE_ROUTES.map((route) => `/${locale}${route}`),
      ),
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
