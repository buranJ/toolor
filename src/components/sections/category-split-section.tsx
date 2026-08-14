import Link from "next/link";

import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { Container } from "@/components/ui/container";
import { TextLink } from "@/components/ui/link";
import { getDictionary, localePath, type Locale } from "@/i18n";
import type { Product } from "@/types";

function CategoryPanel({
  product,
  title,
  href,
  viewLabel,
}: {
  product?: Product;
  title: string;
  href: string;
  viewLabel: string;
}) {
  return (
    <Link
      className="category-panel group bg-frost-deep relative flex min-h-[26rem] flex-1 overflow-hidden rounded-[1.75rem] text-white shadow-[var(--shadow-soft)] transition-shadow duration-300 hover:shadow-[var(--shadow-card)] md:min-h-[40rem]"
      href={href}
    >
      <ResilientEditorialImage
        className="category-panel-image object-cover"
        images={product?.images ?? []}
        sizes="(max-width: 768px) 100vw, 50vw"
        fallbackLabel="TOOLOR"
      />
      <div className="dark-media-scrim absolute inset-0" />
      <div className="relative z-10 flex w-full flex-col justify-end p-6 md:p-9">
        <h3 className="headline-serif text-4xl md:text-6xl">{title}</h3>
        <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium">
          {viewLabel}
          <span
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            →
          </span>
        </span>
      </div>
    </Link>
  );
}

export function CategorySplitSection({
  locale,
  menProduct,
  womenProduct,
}: {
  locale: Locale;
  menProduct?: Product;
  womenProduct?: Product;
}) {
  const d = getDictionary(locale);
  const copy = d.home.categorySplit;

  return (
    <section
      className="bg-paper py-20 md:py-28"
      id="categories"
      data-scroll-anchor="categories"
    >
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="section-serif mt-4 max-w-[16ch]">{copy.title}</h2>
          </div>
          <TextLink href={localePath(locale, "/catalog")}>
            {copy.allCatalog}
          </TextLink>
        </div>
        <div className="category-split mt-10 flex flex-col gap-5 md:flex-row">
          <CategoryPanel
            href={localePath(locale, "/catalog/men")}
            product={menProduct}
            title={copy.men}
            viewLabel={d.common.view}
          />
          <CategoryPanel
            href={localePath(locale, "/catalog/women")}
            product={womenProduct}
            title={copy.women}
            viewLabel={d.common.view}
          />
        </div>
      </Container>
    </section>
  );
}
