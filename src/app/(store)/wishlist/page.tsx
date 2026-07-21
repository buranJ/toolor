import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Избранное",
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return (
    <>
      <PageHeader
        kicker="Local demo"
        title="Избранное"
        description="Временный интерфейс без пользовательского аккаунта и серверной синхронизации."
      />
      <Container className="py-10 md:py-16">
        <EmptyState
          title="Список пока пуст"
          description="Сохранение товаров будет подключено вместе с выбранным commerce backend."
          action={{ href: "/catalog", label: "Смотреть каталог" }}
        />
      </Container>
    </>
  );
}
