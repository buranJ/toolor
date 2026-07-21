import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "Устойчивое развитие",
  description: "Принципы будущего раздела прозрачности TOOLOR.",
  alternates: { canonical: "/sustainability" },
};
export default function SustainabilityPage() {
  return (
    <ContentPage
      kicker="Responsibility"
      title="Данные прежде обещаний"
      description="Раздел не содержит неподтверждённых экологических заявлений."
    >
      <p>
        Будущая версия должна опираться на подтверждённые сведения о материалах,
        цепочке производства, упаковке, долговечности и уходе.
      </p>
      <p>
        Каждое числовое или сравнительное утверждение потребует источника,
        владельца данных и даты обновления.
      </p>
    </ContentPage>
  );
}
