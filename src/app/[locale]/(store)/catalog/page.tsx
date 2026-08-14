import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogControls } from "@/components/catalog/catalog-controls";
import { PageHeader } from "@/components/layout/page-header";
import { ProductGrid } from "@/components/product/product-grid";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getDictionary,
  isLocale,
  localeAlternates,
  localeIntl,
  localePath,
} from "@/i18n";
import {
  commerce,
  localizeCategories,
  localizeCollections,
} from "@/lib/commerce";
import { parseProductQuery, type RawSearchParams } from "@/lib/validation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale);

  return {
    title: d.meta.catalogTitle,
    description: d.meta.catalogDescription,
    alternates: {
      canonical: localePath(locale, "/catalog"),
      languages: localeAlternates("/catalog"),
    },
  };
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);

  const filters = parseProductQuery(await searchParams);
  const [result, categories, collections, allProducts] = await Promise.all([
    commerce.getProducts(filters),
    commerce.getCategories(),
    commerce.getCollections(),
    commerce.getProducts({ pageSize: 100 }),
  ]);
  // Colour and size values come from the workbook; sort them with the active
  // locale's collation so the filter lists read naturally in each language.
  const collator = localeIntl[locale];
  const colors = [
    ...new Set(allProducts.items.flatMap((product) => product.colors ?? [])),
  ].sort((a, b) => a.localeCompare(b, collator));
  const sizes = [
    ...new Set(allProducts.items.flatMap((product) => product.sizes ?? [])),
  ].sort((a, b) => a.localeCompare(b, collator));

  return (
    <>
      <PageHeader compact kicker="" title={d.catalog.title} />
      <Container className="py-6 md:py-10">
        <CatalogControls
          categories={localizeCategories(categories, d)}
          collections={localizeCollections(collections, d)}
          colors={colors}
          filters={filters}
          locale={locale}
          resultCount={result.totalItems}
          sizes={sizes}
        />
        <div className="mt-10">
          {result.items.length ? (
            <ProductGrid
              locale={locale}
              prioritizeFirstRow
              products={result.items}
            />
          ) : (
            <EmptyState
              action={{
                href: localePath(locale, "/catalog"),
                label: d.catalog.resetFilters,
              }}
              description={d.catalog.emptyDescription}
              locale={locale}
              title={d.catalog.emptyTitle}
            />
          )}
        </div>
      </Container>
    </>
  );
}
