import type { Metadata } from "next";

import { CartView } from "@/components/cart/cart-view";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Корзина",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <Container className="py-10 md:py-16">
      <header className="border-line mb-10 grid gap-5 border-b pb-8 md:grid-cols-[1fr_24rem] md:items-end md:pb-10">
        <div>
          <p className="eyebrow text-brand">Ваш выбор</p>
          <h1 className="section-serif mt-5">Корзина</h1>
        </div>
        <p className="text-muted text-sm leading-relaxed">
          Товары сохраняются локально в этом браузере. Остатки и условия заказа
          требуют подтверждения.
        </p>
      </header>
      <CartView />
    </Container>
  );
}
