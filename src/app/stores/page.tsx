import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "Магазины",
  description: "Будущая страница проверенных адресов TOOLOR.",
  alternates: { canonical: "/stores" },
};
export default function StoresPage() {
  return (
    <ContentPage
      kicker="Offline"
      title="Найти TOOLOR"
      description="Адреса и часы работы ожидают подтверждения."
    >
      <p>
        Финальная страница будет содержать только проверенные адреса, контакты,
        часы работы и доступность услуг.
      </p>
      <p>
        До подтверждения бизнес-данных карта и контактные сведения намеренно не
        публикуются.
      </p>
    </ContentPage>
  );
}
