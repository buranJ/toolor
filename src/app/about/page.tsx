import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "О бренде",
  description: "Структура будущей истории TOOLOR.",
  alternates: { canonical: "/about" },
};
export default function AboutPage() {
  return (
    <ContentPage
      kicker="TOOLOR / About"
      title="История в движении"
      description="Раздел подготовлен для утверждённой истории бренда."
    >
      <p>
        TOOLOR — современный бренд одежды из Кыргызстана. Расширенная история,
        даты и факты будут опубликованы только после редакционной проверки.
      </p>
      <p>
        Визуальная и контентная архитектура позволяет соединить бренд-манифест,
        материалы о дизайне и будущий cinematic layer.
      </p>
    </ContentPage>
  );
}
