import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "Доставка",
  description: "Placeholder условий доставки TOOLOR.",
  alternates: { canonical: "/delivery" },
};
export default function DeliveryPage() {
  return (
    <ContentPage
      kicker="Customer care"
      title="Доставка"
      description="Условия, стоимость и география доставки пока не подтверждены."
    >
      <p>
        Здесь появятся проверенные сроки, регионы, способы получения, стоимость
        и порядок отслеживания.
      </p>
      <p>
        До интеграции логистики checkout не рассчитывает и не обещает сроки
        доставки.
      </p>
    </ContentPage>
  );
}
