import type { Metadata } from "next";

import { CheckoutSkeleton } from "@/components/checkout/checkout-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Оформление — Demo",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <>
      <PageHeader
        kicker="Prototype only"
        title="Оформление"
        description="Без оплаты, передачи данных и создания заказа."
      />
      <Container className="py-10 md:py-16">
        <CheckoutSkeleton />
      </Container>
    </>
  );
}
