import Link from "next/link";

import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { Container } from "@/components/ui/container";
import {
  featuredCategoryMosaicContent,
  featuredCategoryMosaicItems,
} from "@/data/featured-category-mosaic";
import type { Product } from "@/types";

function leadImages(product: Product | undefined, offset: number) {
  if (!product || product.images.length <= offset) return product?.images ?? [];

  return [...product.images.slice(offset), ...product.images.slice(0, offset)];
}

export function FeaturedCategoryMosaicSection({
  products,
}: {
  products: Product[];
}) {
  const items = featuredCategoryMosaicItems.map((item) => ({
    ...item,
    product: products.find(
      (product) => product.productType === item.productType,
    ),
  }));

  return (
    <section
      className="bg-white py-20 md:py-28"
      data-scroll-anchor="featured-categories"
      data-testid="featured-category-mosaic"
    >
      <Container>
        <header className="text-center">
          <p className="eyebrow text-brand">
            {featuredCategoryMosaicContent.kicker}
          </p>
          <h2 className="section-serif mt-4">
            {featuredCategoryMosaicContent.title}
          </h2>
          <p className="text-muted mx-auto mt-4 max-w-xl text-sm leading-6">
            {featuredCategoryMosaicContent.description}
          </p>
        </header>

        <div className="featured-category-mosaic mt-10 md:mt-14">
          {[1, 2, 3].map((column) => (
            <div
              className={`featured-category-column featured-category-column-${column}`}
              key={column}
            >
              {items
                .filter((item) => item.column === column)
                .map((item, index) => (
                  <Link
                    className={`featured-category-tile featured-category-tile-${item.size} group`}
                    data-mosaic-position={(column - 1) * 2 + index + 1}
                    href={item.href}
                    key={item.href}
                  >
                    <ResilientEditorialImage
                      className="featured-category-image object-cover"
                      fallbackLabel={item.label}
                      images={leadImages(item.product, item.imageOffset)}
                      sizes="(max-width: 767px) 50vw, 33vw"
                    />
                    <span
                      aria-hidden="true"
                      className="featured-category-overlay"
                    />
                    <span className="featured-category-number">
                      0{(column - 1) * 2 + index + 1}
                    </span>
                    <span className="featured-category-content">
                      <strong>{item.label}</strong>
                      <span>Смотреть категорию&nbsp; ↗</span>
                    </span>
                  </Link>
                ))}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
