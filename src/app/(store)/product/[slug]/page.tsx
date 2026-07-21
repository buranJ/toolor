import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { ProductAccordion } from "@/components/product/product-accordion";
import { ProductCard } from "@/components/product/product-card";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchasePanel } from "@/components/product/product-purchase-panel";
import { Container } from "@/components/ui/container";
import { commerce } from "@/lib/commerce";
import { formatMoney } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await commerce.getProductBySlug(slug);
  if (!product) return { title: "Товар не найден" };
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/product/${product.slug}` },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await commerce.getProductBySlug(slug);
  if (!product) notFound();
  const variant = product.variants[0];
  if (!variant) notFound();

  const category = (await commerce.getCategories()).find(
    (item) => item.id === product.categoryId,
  );
  const { items: categoryProducts } = await commerce.getProducts({
    category: category?.slug,
    pageSize: 8,
  });
  const related = categoryProducts
    .filter((item) => item.id !== product.id)
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: variant.sku,
    image: product.images.map((image) => image.url),
    brand: { "@type": "Brand", name: "TOOLOR" },
    offers: {
      "@type": "Offer",
      priceCurrency: product.price.currencyCode,
      price: (product.price.amount / 100).toFixed(2),
      availability: "https://schema.org/OutOfStock",
      url: `/product/${product.slug}`,
    },
    additionalProperty: {
      "@type": "PropertyValue",
      name: "Availability status",
      value: "Unknown in source workbook",
    },
  };

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
        type="application/ld+json"
      />
      <Container className="py-5 md:py-10">
        <nav
          aria-label="Хлебные крошки"
          className="text-muted mb-5 flex flex-wrap gap-2 text-xs"
        >
          <Link href="/catalog">Каталог</Link>
          <span>/</span>
          {category ? (
            <>
              <Link href={`/catalog/${category.slug}`}>{category.name}</Link>
              <span>/</span>
            </>
          ) : null}
          <span aria-current="page" className="text-ink line-clamp-1">
            {product.name}
          </span>
        </nav>

        <div className="product-hero-grid">
          <ProductGallery
            images={product.images}
            productName={product.name}
            productType={product.productType}
          />

          <aside className="product-info-panel">
            <div className="flex items-center justify-between gap-4">
              <p className="eyebrow text-brand">
                {product.productType ?? category?.name ?? "TOOLOR"}
              </p>
              <p className="mono-meta text-muted">Product / 01</p>
            </div>
            <h1 className="product-title mt-5">{product.name}</h1>
            <p className="mt-6 text-2xl font-semibold">
              {formatMoney(product.price)}
            </p>
            <div className="mt-8">
              <ProductPurchasePanel product={product} />
            </div>
            <ProductAccordion product={product} />
          </aside>
        </div>

        {product.images.length > 2 ? (
          <section
            aria-label="Дополнительные изображения товара"
            className="product-detail-gallery"
          >
            <div className="product-detail-gallery-wide">
              <ResilientEditorialImage
                images={[
                  ...product.images.slice(2),
                  ...product.images.slice(0, 2),
                ]}
                sizes="(max-width: 767px) 100vw, 68vw"
              />
              <span className="mono-meta">Detail / 02</span>
            </div>
            <div className="product-detail-gallery-tall">
              <ResilientEditorialImage
                images={[
                  ...product.images.slice(3),
                  ...product.images.slice(0, 3),
                ]}
                sizes="(max-width: 767px) 100vw, 32vw"
              />
              <span className="mono-meta">Study / 03</span>
            </div>
          </section>
        ) : null}
      </Container>

      {related.length ? (
        <section className="border-line border-t py-14 md:py-24">
          <Container>
            <div className="mb-8 flex items-end justify-between gap-5">
              <div>
                <p className="eyebrow text-brand">В этой категории</p>
                <h2 className="section-serif mt-4">Смотрите также</h2>
              </div>
              <Link
                className="link-underline pb-1 text-sm font-medium"
                href={category ? `/catalog/${category.slug}` : "/catalog"}
              >
                Все товары
              </Link>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-12">
              {related.map((item) => (
                <div
                  key={item.id}
                  className="w-[calc(50%-0.75rem)] max-w-[22rem] md:w-[calc(25%-1.125rem)]"
                >
                  <ProductCard product={item} />
                </div>
              ))}
            </div>
          </Container>
        </section>
      ) : null}
    </>
  );
}
