import type { MetadataRoute } from "next";
import { commerce } from "@/lib/commerce";
import { siteConfig } from "@/lib/config/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    commerce.getProducts({ pageSize: 100 }),
    commerce.getCategories(),
  ]);
  const routes = [
    "",
    "/catalog",
    "/about",
    "/sustainability",
    "/stores",
    "/delivery",
    "/returns",
  ];
  return [
    ...routes.map((route) => ({
      url: `${siteConfig.url}${route}`,
      changeFrequency:
        route === "" ? ("weekly" as const) : ("monthly" as const),
      priority: route === "" ? 1 : 0.7,
    })),
    ...categories.map((category) => ({
      url: `${siteConfig.url}/catalog/${category.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.items.map((product) => ({
      url: `${siteConfig.url}/product/${product.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
