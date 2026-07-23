import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Заказы",
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return (
    <EmptyState
      title="Заказов пока нет"
      description="Здесь будут ваши заказы и их статусы."
      action={{ href: "/catalog", label: "Начать покупки" }}
    />
  );
}
