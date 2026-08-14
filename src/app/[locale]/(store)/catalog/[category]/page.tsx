import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogControls } from "@/components/catalog/catalog-controls";
import { PageHeader } from "@/components/layout/page-header";
import { ProductGrid } from "@/components/product/product-grid";
import { Container } from "@/components/ui/container";
import {
  getDictionary,
  isLocale,
  localeAlternates,
  localeIntl,
  localePath,
  locales,
} from "@/i18n";
import {
  commerce,
  localizeCategories,
  localizeCategory,
  localizeCollections,
} from "@/lib/commerce";
import { parseProductQuery, type RawSearchParams } from "@/lib/validation";

export async function generateStaticParams() {
  const categories = await commerce.getCategories();
  return locales.flatMap((locale) =>
    categories.map((category) => ({ locale, category: category.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale, category: slug } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale);

  const category = (await commerce.getCategories()).find(
    (item) => item.slug === slug,
  );
  if (!category) return { title: d.catalog.categoryNotFound };

  const localized = localizeCategory(category, d);
  return {
    title: localized.name,
    description: localized.description,
    alternates: {
      canonical: localePath(locale, `/catalog/${category.slug}`),
      languages: localeAlternates(`/catalog/${category.slug}`),
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { locale, category: slug } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);

  const [categories, collections, allProducts] = await Promise.all([
    commerce.getCategories(),
    commerce.getCollections(),
    commerce.getProducts({ pageSize: 100 }),
  ]);
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();

  const filters = { ...parseProductQuery(await searchParams), category: slug };
  const result = await commerce.getProducts(filters);
  const collator = localeIntl[locale];
  const colors = [
    ...new Set(allProducts.items.flatMap((product) => product.colors ?? [])),
  ].sort((a, b) => a.localeCompare(b, collator));
  const sizes = [
    ...new Set(allProducts.items.flatMap((product) => product.sizes ?? [])),
  ].sort((a, b) => a.localeCompare(b, collator));

  return (
    <>
      <PageHeader
        compact
        kicker={d.catalog.collectionKicker}
        title={localizeCategory(category, d).name}
      />
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
          <ProductGrid
            locale={locale}
            prioritizeFirstRow
            products={result.items}
          />
        </div>
      </Container>
    </>
  );
}
