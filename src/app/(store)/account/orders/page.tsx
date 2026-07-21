import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Заказы",
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return (
    <EmptyState
      title="Заказов нет"
      description="История заказов станет доступна после подключения аккаунтов и commerce backend."
    />
  );
}
