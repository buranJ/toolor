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
    title: d.meta.storesTitle,
    description: d.meta.storesDescription,
    alternates: {
      canonical: localePath(locale, "/stores"),
      languages: localeAlternates("/stores"),
    },
  };
}

export default async function StoresPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = getDictionary(locale).pages.stores;

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
