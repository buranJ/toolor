import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "Сообщество",
  description: "Будущее редакционное пространство сообщества TOOLOR.",
  alternates: { canonical: "/community" },
};
export default function CommunityPage() {
  return (
    <ContentPage
      kicker="Community"
      title="Люди, маршруты, движение"
      description="Нейтральный placeholder будущего редакционного раздела."
    >
      <p>
        Здесь смогут появиться проверенные истории сообщества, заметки о
        маршрутах и анонсы событий.
      </p>
      <p>
        До появления редакционного процесса мы не публикуем вымышленные имена,
        события или партнёрства.
      </p>
    </ContentPage>
  );
}
