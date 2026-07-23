import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "Магазины",
  description: "Как найти TOOLOR — онлайн и офлайн.",
  alternates: { canonical: "/stores" },
};
export default function StoresPage() {
  return (
    <ContentPage
      kicker="Offline"
      title="Найти TOOLOR"
      description="Мы работаем онлайн и доставляем по всему Кыргызстану."
    >
      <p>
        Сейчас TOOLOR доступен онлайн: выбирайте вещи в каталоге и оформляйте
        доставку в любую точку Кыргызстана и за рубеж.
      </p>
      <p>
        Мы готовим первые офлайн-точки в Бишкеке. Адреса и часы работы появятся
        здесь — следите за обновлениями и нашими соцсетями.
      </p>
    </ContentPage>
  );
}
