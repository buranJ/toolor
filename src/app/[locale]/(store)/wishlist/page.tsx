import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { WishlistView } from "@/components/product/wishlist-view";
import { Container } from "@/components/ui/container";
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
    title: getDictionary(locale).meta.wishlistTitle,
    robots: { index: false, follow: false },
  };
}

export default async function WishlistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);

  const { items } = await commerce.getProducts({ pageSize: 100 });

  return (
    <>
      <PageHeader compact kicker={d.wishlist.kicker} title={d.wishlist.title} />
      <Container className="py-8 md:py-14">
        <WishlistView locale={locale} products={items} />
      </Container>
    </>
  );
}
