import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Оформление заказа",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <>
      <PageHeader compact kicker="Корзина" title="Оформление заказа" />
      <Container className="py-8 md:py-14">
        <CheckoutForm />
      </Container>
    </>
  );
}
