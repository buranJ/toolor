import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ProductGrid } from "@/components/product/product-grid";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { commerce } from "@/lib/commerce";

export const metadata: Metadata = {
  title: "Поиск",
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  const result = query ? await commerce.searchProducts(query) : null;

  return (
    <>
      <PageHeader
        kicker="Search"
        title="Поиск"
        description="Найдите модель по названию, типу или материалу."
      />
      <Container className="py-10 md:py-16">
        <form className="flex gap-2" method="get">
          <label className="sr-only" htmlFor="site-search">
            Поисковый запрос
          </label>
          <Input
            defaultValue={query}
            id="site-search"
            name="q"
            placeholder="Поиск по каталогу"
            type="search"
          />
          <button
            className="bg-ink px-5 text-xs font-semibold tracking-widest text-white uppercase"
            type="submit"
          >
            Найти
          </button>
        </form>
        <div className="mt-12">
          {result?.items.length ? (
            <ProductGrid products={result.items} />
          ) : (
            <EmptyState
              title={query ? "Совпадений нет" : "Введите запрос"}
              description={
                query
                  ? "Попробуйте другое название."
                  : "Например: Nomad, Mountain или Field."
              }
            />
          )}
        </div>
      </Container>
    </>
  );
}
