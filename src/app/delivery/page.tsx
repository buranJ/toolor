import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "Доставка",
  description: "Условия доставки TOOLOR по Кыргызстану и за рубеж.",
  alternates: { canonical: "/delivery" },
};
export default function DeliveryPage() {
  return (
    <ContentPage
      kicker="Customer care"
      title="Доставка"
      description="Доставляем по всему Кыргызстану и за рубеж."
    >
      <p>
        Доставка по Бишкеку и регионам Кыргызстана, а также международная
        отправка. Сроки и стоимость зависят от направления и рассчитываются при
        оформлении заказа.
      </p>
      <p>
        После отправки мы пришлём номер для отслеживания. По вопросам доставки
        напишите нам — поможем выбрать удобный способ получения.
      </p>
    </ContentPage>
  );
}
