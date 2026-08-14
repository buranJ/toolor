import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";
import { getDictionary, isLocale } from "@/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  return {
    title: getDictionary(locale).meta.checkoutTitle,
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);

  return (
    <>
      <PageHeader compact kicker={d.checkout.kicker} title={d.checkout.title} />
      <Container className="py-8 md:py-14">
        <CheckoutForm locale={locale} />
      </Container>
    </>
  );
}
