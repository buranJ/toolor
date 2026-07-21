import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Личный кабинет",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <EmptyState
      title="Вход не подключён"
      description="Здесь появятся приветствие, статусы заказов и быстрые действия после выбора authentication-провайдера."
    />
  );
}
