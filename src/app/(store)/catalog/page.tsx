import type { Metadata } from "next";

import { CatalogControls } from "@/components/catalog/catalog-controls";
import { PageHeader } from "@/components/layout/page-header";
import { ProductGrid } from "@/components/product/product-grid";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { commerce } from "@/lib/commerce";
import { parseProductQuery, type RawSearchParams } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Каталог",
  description: "Каталог TOOLOR, импортированный из предоставленного workbook.",
  alternates: { canonical: "/catalog" },
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseProductQuery(await searchParams);
  const [result, categories, collections, allProducts] = await Promise.all([
    commerce.getProducts(filters),
    commerce.getCategories(),
    commerce.getCollections(),
    commerce.getProducts({ pageSize: 100 }),
  ]);
  const colors = [
    ...new Set(allProducts.items.flatMap((product) => product.colors ?? [])),
  ].sort((a, b) => a.localeCompare(b, "ru"));
  const sizes = [
    ...new Set(allProducts.items.flatMap((product) => product.sizes ?? [])),
  ].sort((a, b) => a.localeCompare(b, "ru"));

  return (
    <>
      <PageHeader
        compact
        kicker="Shop / Workbook selection"
        title="Каталог"
        description="24 наиболее полные товарные карточки из предоставленного workbook. Наличие требует подтверждения; фильтры сохраняются в URL."
      />
      <Container className="py-6 md:py-10">
        <CatalogControls
          categories={categories}
          collections={collections}
          colors={colors}
          sizes={sizes}
          filters={filters}
          resultCount={result.totalItems}
        />
        <div className="mt-10">
          {result.items.length ? (
            <ProductGrid prioritizeFirstRow products={result.items} />
          ) : (
            <EmptyState
              title="Ничего не найдено"
              description="Измените параметры фильтра или поисковый запрос."
              action={{ href: "/catalog", label: "Сбросить фильтры" }}
            />
          )}
        </div>
      </Container>
    </>
  );
}
