import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Профиль",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <section
      aria-labelledby="profile-title"
      className="border-line max-w-2xl border bg-white p-6 md:p-8"
    >
      <h2 className="text-2xl font-medium" id="profile-title">
        Профиль
      </h2>
      <p className="text-muted mt-3 text-sm leading-6">
        Здесь будут ваши контактные данные, адреса доставки и настройки
        аккаунта.
      </p>
    </section>
  );
}
