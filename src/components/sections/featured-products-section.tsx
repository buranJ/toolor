import Link from "next/link";

import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { ProductCard } from "@/components/product/product-card";
import { Container } from "@/components/ui/container";
import { TextLink } from "@/components/ui/link";
import { RuneReveal } from "@/components/ui/rune-reveal";
import { formatMoney } from "@/lib/utils";
import type { Product } from "@/types";

export function FeaturedProductsSection({ products }: { products: Product[] }) {
  const [lead, ...supporting] = products;
  const detailImages = lead
    ? lead.images.length > 2
      ? [...lead.images.slice(2), ...lead.images.slice(0, 2)]
      : lead.images
    : [];

  return (
    <section
      className="bg-paper relative overflow-hidden py-20 md:py-28"
      data-scroll-anchor="products"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <RuneReveal
          variant="grey"
          from="right"
          targetOpacity={0.75}
          className="absolute top-24 right-0 w-[46rem] max-w-none translate-x-1/6 rotate-3"
        />
        <RuneReveal
          variant="grey"
          from="left"
          targetOpacity={0.7}
          className="absolute bottom-6 left-0 w-[42rem] max-w-none -translate-x-1/6 -rotate-3"
        />
      </div>
      <Container className="relative z-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow text-brand"></p>
            <h2 className="section-serif mt-4">Из новой коллекции</h2>
          </div>
          <TextLink href="/catalog">Все товары</TextLink>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-12 md:mt-14">
          {lead ? (
            <div className="lg:col-span-7">
              <ProductCard
                imagePriority
                imageSizes="(max-width: 1024px) 100vw, 58vw"
                product={lead}
                large
              />
            </div>
          ) : null}

          {lead ? (
            <Link
              className="group bg-frost-deep relative min-h-[26rem] overflow-hidden rounded-[1.75rem] text-white shadow-[var(--shadow-soft)] lg:col-span-5 lg:min-h-0"
              href={`/product/${lead.slug}`}
            >
              <ResilientEditorialImage
                className="product-card-media object-cover"
                images={detailImages}
                sizes="(max-width: 1024px) 100vw, 42vw"
                fallbackLabel="Detail / TOOLOR"
              />
              <div className="dark-media-scrim absolute inset-0" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-5 p-6">
                <div>
                  <p className="text-sm text-white/80">{formatMoney(lead.price)}</p>
                  <p className="headline-serif mt-2 max-w-sm text-2xl">
                    {lead.name}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-white/70 transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  →
                </span>
              </div>
            </Link>
          ) : null}

          <div className="grid grid-cols-2 gap-5 lg:col-span-12 lg:grid-cols-4 lg:gap-6">
            {supporting.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
