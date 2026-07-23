import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "Возврат",
  description: "Условия обмена и возврата товаров TOOLOR.",
  alternates: { canonical: "/returns" },
};
export default function ReturnsPage() {
  return (
    <ContentPage
      kicker="Customer care"
      title="Обмен и возврат"
      description="Если вещь не подошла — поможем обменять или вернуть."
    >
      <p>
        Вернуть или обменять товар можно в течение 14 дней с момента получения —
        при сохранении товарного вида, бирок и упаковки.
      </p>
      <p>
        Чтобы оформить возврат, напишите нам на info@toolorkg.com с номером
        заказа — и мы подскажем удобный способ.
      </p>
    </ContentPage>
  );
}
