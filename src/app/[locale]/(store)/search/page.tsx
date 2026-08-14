import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ProductGrid } from "@/components/product/product-grid";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { getDictionary, isLocale } from "@/i18n";
import { commerce } from "@/lib/commerce";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  return {
    title: getDictionary(locale).meta.searchTitle,
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);

  const query = (await searchParams).q?.trim() ?? "";
  const result = query ? await commerce.searchProducts(query) : null;

  return (
    <>
      <PageHeader
        kicker={d.search.kicker}
        title={d.search.title}
        description={d.search.description}
      />
      <Container className="py-10 md:py-16">
        <form className="flex gap-2" method="get">
          <label className="sr-only" htmlFor="site-search">
            {d.search.label}
          </label>
          <Input
            defaultValue={query}
            id="site-search"
            name="q"
            placeholder={d.search.placeholder}
            type="search"
          />
          <button
            className="bg-ink px-5 text-xs font-semibold tracking-widest text-white uppercase"
            type="submit"
          >
            {d.search.submit}
          </button>
        </form>
        <div className="mt-12">
          {result?.items.length ? (
            <ProductGrid locale={locale} products={result.items} />
          ) : (
            <EmptyState
              description={
                query
                  ? d.search.noMatchesDescription
                  : d.search.emptyDescription
              }
              locale={locale}
              title={query ? d.search.noMatchesTitle : d.search.emptyTitle}
            />
          )}
        </div>
      </Container>
    </>
  );
}
