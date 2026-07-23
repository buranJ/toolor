import type { Metadata } from "next";

import { CategorySplitSection } from "@/components/sections/category-split-section";
import { FeaturedCollectionSection } from "@/components/sections/featured-collection-section";
import { FeaturedCategoryMosaicSection } from "@/components/sections/featured-category-mosaic-section";
import { FeaturedProductsSection } from "@/components/sections/featured-products-section";
import { HeroSection } from "@/components/sections/hero/hero-section";
import { ModernNomadsSection } from "@/components/sections/modern-nomads-section";
import { ReviewsSection } from "@/components/sections/reviews-section";
import { SustainabilitySection } from "@/components/sections/sustainability-section";
import { commerce } from "@/lib/commerce";
import type { Product } from "@/types";

export const metadata: Metadata = {
  title: "TOOLOR — одежда для современных кочевников",
  description:
    "Современная одежда из Кыргызстана для города и открытого маршрута.",
  alternates: { canonical: "/" },
};

/** Rotate an image list so a later frame leads, without ever emptying it. */
function leadFrom(product: Product | undefined, offset: number) {
  if (!product) return [];
  const images = product.images;
  if (images.length <= offset) return images;
  return [...images.slice(offset), ...images.slice(0, offset)];
}

export default async function HomePage() {
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
      <HeroSection
        content={{
          kicker: "Кыргызстан · Технологичная одежда",
          title: "Modern nomads",
          description:
            "Одежда для движения между городом и открытым маршрутом — для тех, кто не стоит на месте.",
          primaryCta: { href: "/catalog", label: "Смотреть каталог" },
          secondaryCta: { href: "/about", label: "О направлении" },
        }}
        images={heroProduct?.images ?? []}
      />
      <FeaturedCategoryMosaicSection products={products} />
      <CategorySplitSection
        menProduct={menProduct}
        womenProduct={womenProduct}
      />
      
      <FeaturedCollectionSection products={editorialProducts} />
      <FeaturedProductsSection products={productSelection} />
      <ModernNomadsSection images={leadFrom(heroProduct, 1)} />
     
      <SustainabilitySection
        product={products.find((product) => Boolean(product.material))}
      />
       <ReviewsSection />
    </div>
  );
}
