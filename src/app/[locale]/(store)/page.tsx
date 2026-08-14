import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppPromoSection } from "@/components/sections/app-promo-section";
import { CategorySplitSection } from "@/components/sections/category-split-section";
import { FeaturedCollectionSection } from "@/components/sections/featured-collection-section";
import { FeaturedCategoryMosaicSection } from "@/components/sections/featured-category-mosaic-section";
import { FeaturedProductsSection } from "@/components/sections/featured-products-section";
import { HeroSection } from "@/components/sections/hero/hero-section";
import { ModernNomadsSection } from "@/components/sections/modern-nomads-section";
import { ReviewsSection } from "@/components/sections/reviews-section";
import { SustainabilitySection } from "@/components/sections/sustainability-section";
import { getDictionary, isLocale, localeAlternates } from "@/i18n";
import { commerce } from "@/lib/commerce";
import type { Product } from "@/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale);

  return {
    title: d.meta.homeTitle,
    description: d.meta.homeDescription,
    alternates: {
      canonical: `/${locale}`,
      languages: localeAlternates("/"),
    },
  };
}

/** Rotate an image list so a later frame leads, without ever emptying it. */
function leadFrom(product: Product | undefined, offset: number) {
  if (!product) return [];
  const images = product.images;
  if (images.length <= offset) return images;
  return [...images.slice(offset), ...images.slice(0, offset)];
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { items: products } = await commerce.getProducts({ pageSize: 100 });
  const withImages = products.filter((product) => product.images.length > 0);
  const byImageWealth = [...withImages].sort(
    (a, b) => b.images.length - a.images.length,
  );

  // Hero prefers a Kyrgyz-landscape lifestyle look: the "Ала-Тоо" men's set,
  // then the most image-rich men product, then the richest product overall.
  const heroProduct =
    withImages.find((product) => product.slug === "toolor-135-1") ??
    byImageWealth.find((product) => product.gender === "men") ??
    byImageWealth[0];

  const menProduct =
    byImageWealth.find(
      (product) => product.gender === "men" && product.id !== heroProduct?.id,
    ) ??
    byImageWealth.find((product) => product.gender === "men") ??
    heroProduct;
  const womenProduct =
    byImageWealth.find((product) => product.gender === "women") ??
    byImageWealth[0];

  const featuredProducts = products.filter((product) => product.featured);
  const editorialProducts = [
    ...featuredProducts,
    ...byImageWealth.filter((product) => !featuredProducts.includes(product)),
  ].slice(0, 7);
  const productSelection = products
    .filter((product) => !editorialProducts.includes(product))
    .slice(0, 5);

  return (
    <div data-page="home">
      <HeroSection locale={locale} />
      <FeaturedCategoryMosaicSection locale={locale} products={products} />
      <CategorySplitSection
        locale={locale}
        menProduct={menProduct}
        womenProduct={womenProduct}
      />

      <FeaturedCollectionSection locale={locale} products={editorialProducts} />
      <FeaturedProductsSection locale={locale} products={productSelection} />
      <ModernNomadsSection locale={locale} images={leadFrom(heroProduct, 1)} />

      <SustainabilitySection
        locale={locale}
        product={products.find((product) => Boolean(product.material))}
      />
      <ReviewsSection locale={locale} />
      <AppPromoSection locale={locale} />
    </div>
  );
}
