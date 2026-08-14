import type { MetadataRoute } from "next";

import { localeAlternates, localePath, locales } from "@/i18n";
import { commerce } from "@/lib/commerce";
import { siteConfig } from "@/lib/config/site";

/**
 * Every public route is emitted once per locale, each entry carrying the full
 * `alternates.languages` set so search engines can pair the translations.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    commerce.getProducts({ pageSize: 100 }),
    commerce.getCategories(),
  ]);

  const staticRoutes = [
    "/",
    "/catalog",
    "/about",
    "/sustainability",
    "/stores",
    "/delivery",
    "/returns",
  ];
  const categoryRoutes = categories.map(
    (category) => `/catalog/${category.slug}`,
  );
  const productRoutes = products.items.map(
    (product) => `/product/${product.slug}`,
  );

  function entriesFor(
    route: string,
    priority: number,
    changeFrequency: "weekly" | "monthly",
  ) {
    const languages = Object.fromEntries(
      Object.entries(localeAlternates(route)).map(([locale, path]) => [
        locale,
        `${siteConfig.url}${path}`,
      ]),
    );

    return locales.map((locale) => ({
      url: `${siteConfig.url}${localePath(locale, route)}`,
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  }

  return [
    ...staticRoutes.flatMap((route) =>
      entriesFor(
        route,
        route === "/" ? 1 : 0.7,
        route === "/" ? "weekly" : "monthly",
      ),
    ),
    ...categoryRoutes.flatMap((route) => entriesFor(route, 0.8, "weekly")),
    ...productRoutes.flatMap((route) => entriesFor(route, 0.7, "weekly")),
  ];
}
