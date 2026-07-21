import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogControls } from "@/components/catalog/catalog-controls";
import { PageHeader } from "@/components/layout/page-header";
import { ProductGrid } from "@/components/product/product-grid";
import { Container } from "@/components/ui/container";
import { commerce } from "@/lib/commerce";
import { parseProductQuery, type RawSearchParams } from "@/lib/validation";

export async function generateStaticParams() {
  return (await commerce.getCategories()).map((category) => ({
    category: category.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = (await commerce.getCategories()).find(
    (item) => item.slug === slug,
  );
  if (!category) return { title: "Категория не найдена" };
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: `/catalog/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { category: slug } = await params;
  const [categories, collections, allProducts] = await Promise.all([
    commerce.getCategories(),
    commerce.getCollections(),
    commerce.getProducts({ pageSize: 100 }),
  ]);
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  const filters = { ...parseProductQuery(await searchParams), category: slug };
  const result = await commerce.getProducts(filters);
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
        kicker="Category / Workbook selection"
        title={category.name}
        description={category.description ?? "Категория из workbook TOOLOR."}
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
          <ProductGrid prioritizeFirstRow products={result.items} />
        </div>
      </Container>
    </>
  );
}
