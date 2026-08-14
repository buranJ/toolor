import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { getDictionary, isLocale, localePath } from "@/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  return {
    title: getDictionary(locale).meta.ordersTitle,
    robots: { index: false, follow: false },
  };
}

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);

  return (
    <EmptyState
      action={{
        href: localePath(locale, "/catalog"),
        label: d.account.startShopping,
      }}
      description={d.account.ordersEmptyDescription}
      locale={locale}
      title={d.account.ordersEmptyTitle}
    />
  );
}
