import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentPage } from "@/components/layout/content-page";
import { getDictionary, isLocale, localeAlternates, localePath } from "@/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale);

  return {
    title: d.meta.deliveryTitle,
    description: d.meta.deliveryDescription,
    alternates: {
      canonical: localePath(locale, "/delivery"),
      languages: localeAlternates("/delivery"),
    },
  };
}

export default async function DeliveryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = getDictionary(locale).pages.delivery;

  return (
    <ContentPage
      kicker={copy.kicker}
      title={copy.title}
      description={copy.description}
    >
      <p>{copy.p1}</p>
      <p>{copy.p2}</p>
    </ContentPage>
  );
}
