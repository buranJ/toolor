import Link from "next/link";

import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { Container } from "@/components/ui/container";
import { TextLink } from "@/components/ui/link";
import type { Product } from "@/types";

function CategoryPanel({
  product,
  title,
  label,
  href,
  index,
}: {
  product?: Product;
  title: string;
  label: string;
  href: string;
  index: string;
}) {
  return (
    <Link
      className="category-panel group relative flex min-h-[26rem] flex-1 overflow-hidden rounded-[1.75rem] bg-frost-deep text-white shadow-[var(--shadow-soft)] transition-shadow duration-300 hover:shadow-[var(--shadow-card)] md:min-h-[40rem]"
      href={href}
    >
      <ResilientEditorialImage
        className="category-panel-image object-cover"
        images={product?.images ?? []}
        sizes="(max-width: 768px) 100vw, 50vw"
        fallbackLabel={`${index} / TOOLOR`}
      />
      <div className="dark-media-scrim absolute inset-0" />
      <div className="relative z-10 flex w-full flex-col justify-between p-6 md:p-9">
        <div className="flex items-center justify-between">
          <span className="mono-meta rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
            {index}
          </span>
          <span className="mono-meta text-white/70">{label}</span>
        </div>
        <div>
          <h3 className="headline-serif text-4xl md:text-6xl">{title}</h3>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium">
            Смотреть
            <span
              aria-hidden="true"
              className="category-arrow grid size-6 place-items-center rounded-full border border-white/70"
            >
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CategorySplitSection({
  menProduct,
  womenProduct,
}: {
  menProduct?: Product;
  womenProduct?: Product;
}) {
  return (
    <section
      className="bg-paper py-20 md:py-28"
      id="categories"
      data-scroll-anchor="categories"
    >
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow text-brand">Shop by category</p>
            <h2 className="section-serif mt-4 max-w-[16ch]">
              Найдите свой маршрут
            </h2>
          </div>
          <TextLink href="/catalog">Весь каталог</TextLink>
        </div>
        <div className="category-split mt-10 flex flex-col gap-5 md:flex-row">
          <CategoryPanel
            href="/catalog/men"
            index="01"
            label="Men"
            product={menProduct}
            title="Мужчинам"
          />
          <CategoryPanel
            href="/catalog/women"
            index="02"
            label="Women"
            product={womenProduct}
            title="Женщинам"
          />
        </div>
      </Container>
    </section>
  );
}
