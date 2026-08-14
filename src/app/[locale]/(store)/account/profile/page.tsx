import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary, isLocale } from "@/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  return {
    title: getDictionary(locale).meta.profileTitle,
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);

  return (
    <section
      aria-labelledby="profile-title"
      className="border-line max-w-2xl border bg-white p-6 md:p-8"
    >
      <h2 className="text-2xl font-medium" id="profile-title">
        {d.account.profileTitle}
      </h2>
      <p className="text-muted mt-3 text-sm leading-6">
        {d.account.profileDescription}
      </p>
    </section>
  );
}
