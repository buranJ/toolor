import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "Возврат",
  description: "Placeholder правил возврата TOOLOR.",
  alternates: { canonical: "/returns" },
};
export default function ReturnsPage() {
  return (
    <ContentPage
      kicker="Customer care"
      title="Возврат"
      description="Юридически значимые правила будут добавлены после проверки."
    >
      <p>
        Раздел будет содержать подтверждённые сроки, состояние товара, процесс
        обращения и способы возврата средств.
      </p>
      <p>
        Этот placeholder не является публичной офертой или политикой возврата.
      </p>
    </ContentPage>
  );
}
