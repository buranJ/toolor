import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CartView } from "@/components/cart/cart-view";
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
    title: getDictionary(locale).meta.cartTitle,
    robots: { index: false, follow: false },
  };
}

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);

  return (
    <Container className="py-10 md:py-16">
      <header className="border-line mb-10 grid gap-5 border-b pb-8 md:grid-cols-[1fr_24rem] md:items-end md:pb-10">
        <div>
          <p className="eyebrow text-brand">{d.cart.kicker}</p>
          <h1 className="section-serif mt-5">{d.cart.title}</h1>
        </div>
        <p className="text-muted text-sm leading-relaxed">{d.cart.intro}</p>
      </header>
      <CartView locale={locale} />
    </Container>
  );
}
