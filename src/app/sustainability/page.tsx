import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "Материалы",
  description: "Подход TOOLOR к материалам, качеству и долговечности.",
  alternates: { canonical: "/sustainability" },
};
export default function SustainabilityPage() {
  return (
    <ContentPage
      kicker="Responsibility"
      title="Сделано, чтобы служить"
      description="Продуманные материалы и вещи, которые живут дольше."
    >
      <p>
        Мы выбираем технологичные и натуральные ткани, чистые линии и крой,
        рассчитанный на движение — чтобы одежда служила долго и оставалась
        удобной каждый день.
      </p>
      <p>
        Меньше трендов, больше смысла: мы делаем вещи, к которым возвращаешься
        сезон за сезоном.
      </p>
    </ContentPage>
  );
}
