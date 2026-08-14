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
    title: d.meta.returnsTitle,
    description: d.meta.returnsDescription,
    alternates: {
      canonical: localePath(locale, "/returns"),
      languages: localeAlternates("/returns"),
    },
  };
}

export default async function ReturnsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = getDictionary(locale).pages.returns;

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
