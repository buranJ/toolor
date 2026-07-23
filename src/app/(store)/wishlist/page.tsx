import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { WishlistView } from "@/components/product/wishlist-view";
import { Container } from "@/components/ui/container";
import { commerce } from "@/lib/commerce";

export const metadata: Metadata = {
  title: "Избранное",
  robots: { index: false, follow: false },
};

export default async function WishlistPage() {
  const { items } = await commerce.getProducts({ pageSize: 100 });

  return (
    <>
      <PageHeader compact kicker="Ваша подборка" title="Избранное" />
      <Container className="py-8 md:py-14">
        <WishlistView products={items} />
      </Container>
    </>
  );
}
