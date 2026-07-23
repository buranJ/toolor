import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = {
  title: "Личный кабинет",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <EmptyState
      title="Войдите в аккаунт"
      description="Здесь будут ваши заказы, избранное и данные профиля."
      action={{ href: "/catalog", label: "Перейти в каталог" }}
    />
  );
}
