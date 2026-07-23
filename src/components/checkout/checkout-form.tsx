"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { EmptyState } from "@/components/ui/empty-state";
import {
  LOCAL_CART_KEY,
  readLocalCart,
  writeLocalCart,
} from "@/features/cart/local-cart";
import { formatMoney } from "@/lib/utils";

const DELIVERY_OPTIONS = [
  {
    id: "bishkek",
    title: "Курьером по Бишкеку",
    note: "Доставим по указанному адресу",
  },
  {
    id: "regions",
    title: "По Кыргызстану",
    note: "Отправка в ваш город",
  },
  {
    id: "international",
    title: "Международная доставка",
    note: "Сроки и стоимость уточняются",
  },
] as const;

const PAYMENT_OPTIONS = [
  {
    id: "cash",
    title: "Наличными при получении",
    note: "Оплата курьеру или в пункте выдачи",
  },
  {
    id: "card",
    title: "Картой онлайн",
    note: "",
  },
] as const;

type Errors = Partial<Record<"name" | "phone" | "city" | "address", string>>;

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function CheckoutForm() {
  const snapshot = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener("toolor-cart-change", onStoreChange);
      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener("toolor-cart-change", onStoreChange);
      };
    },
    () => window.localStorage.getItem(LOCAL_CART_KEY) ?? "",
    () => "",
  );
  const items = useMemo(() => readLocalCart(snapshot), [snapshot]);
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0),
    [items],
  );
  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    comment: "",
    delivery: DELIVERY_OPTIONS[0].id as string,
    payment: PAYMENT_OPTIONS[0].id as string,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): Errors {
    const next: Errors = {};
    if (form.name.trim().length < 2) next.name = "Укажите имя";
    if (!/^[+()\-\s\d]{9,18}$/.test(form.phone.trim()))
      next.phone = "Укажите номер телефона";
    if (form.city.trim().length < 2) next.city = "Укажите город";
    if (form.address.trim().length < 5)
      next.address = "Укажите адрес доставки";
    return next;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const number = `TLR-${String(Date.now()).slice(-6)}`;
    // Order is confirmed by phone; the cart is cleared locally.
    writeLocalCart([]);
    setOrderNumber(number);
    setSubmitting(false);
    window.scrollTo({ top: 0 });
  }

  if (orderNumber) {
    return (
      <div className="mx-auto max-w-xl py-6 text-center md:py-12">
        <span className="bg-brand mx-auto grid size-16 place-items-center rounded-full text-white">
          <CheckIcon />
        </span>
        <h2 className="section-serif mt-8">Заказ принят</h2>
        <p className="text-ink mt-4 text-lg font-medium">№ {orderNumber}</p>
        <p className="text-muted mx-auto mt-4 max-w-md text-base leading-7">
          Мы позвоним вам в рабочее время, подтвердим заказ и согласуем
          доставку и оплату.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            className="bg-brand hover:bg-brand-strong flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-medium text-white transition-colors"
            href="/catalog"
          >
            Продолжить покупки
          </Link>
          <Link
            className="border-ink/80 hover:bg-ink flex min-h-12 items-center justify-center rounded-full border px-7 text-sm font-medium transition-colors hover:text-white"
            href="/"
          >
            На главную
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        action={{ href: "/catalog", label: "Перейти в каталог" }}
        description="Добавьте товары в корзину, чтобы оформить заказ."
        title="Корзина пуста"
      />
    );
  }

  return (
    <form
      className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(21rem,0.85fr)]"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="space-y-6">
        {/* Contacts */}
        <section className="checkout-card">
          <h2 className="checkout-card-title">Контакты</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="checkout-field sm:col-span-2">
              <span>Имя и фамилия *</span>
              <input
                autoComplete="name"
                data-invalid={Boolean(errors.name)}
                name="name"
                onChange={(event) => set("name", event.target.value)}
                placeholder="Как к вам обращаться"
                type="text"
                value={form.name}
              />
              {errors.name ? <em>{errors.name}</em> : null}
            </label>
            <label className="checkout-field">
              <span>Телефон *</span>
              <input
                autoComplete="tel"
                data-invalid={Boolean(errors.phone)}
                inputMode="tel"
                name="phone"
                onChange={(event) => set("phone", event.target.value)}
                placeholder="+996 ___ ___ ___"
                type="tel"
                value={form.phone}
              />
              {errors.phone ? <em>{errors.phone}</em> : null}
            </label>
            <label className="checkout-field">
              <span>Email</span>
              <input
                autoComplete="email"
                name="email"
                onChange={(event) => set("email", event.target.value)}
                placeholder="name@example.com"
                type="email"
                value={form.email}
              />
            </label>
          </div>
        </section>

        {/* Delivery */}
        <section className="checkout-card">
          <h2 className="checkout-card-title">Доставка</h2>
          <div className="mt-6 grid gap-3">
            {DELIVERY_OPTIONS.map((option) => (
              <label
                className="checkout-choice"
                data-checked={form.delivery === option.id}
                key={option.id}
              >
                <input
                  checked={form.delivery === option.id}
                  className="sr-only"
                  name="delivery"
                  onChange={() => set("delivery", option.id)}
                  type="radio"
                  value={option.id}
                />
                <span aria-hidden="true" className="checkout-choice-dot" />
                <span className="min-w-0">
                  <strong>{option.title}</strong>
                  <small>{option.note}</small>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-[0.8fr_1.2fr]">
            <label className="checkout-field">
              <span>Город *</span>
              <input
                autoComplete="address-level2"
                data-invalid={Boolean(errors.city)}
                name="city"
                onChange={(event) => set("city", event.target.value)}
                placeholder="Бишкек"
                type="text"
                value={form.city}
              />
              {errors.city ? <em>{errors.city}</em> : null}
            </label>
            <label className="checkout-field">
              <span>Адрес *</span>
              <input
                autoComplete="street-address"
                data-invalid={Boolean(errors.address)}
                name="address"
                onChange={(event) => set("address", event.target.value)}
                placeholder="Улица, дом, квартира"
                type="text"
                value={form.address}
              />
              {errors.address ? <em>{errors.address}</em> : null}
            </label>
            <label className="checkout-field sm:col-span-2">
              <span>Комментарий к заказу</span>
              <input
                name="comment"
                onChange={(event) => set("comment", event.target.value)}
                placeholder="Подъезд, этаж, удобное время — всё, что нам важно знать"
                type="text"
                value={form.comment}
              />
            </label>
          </div>
          <p className="text-muted mt-5 text-sm leading-6">
            Стоимость доставки зависит от города и согласуется при
            подтверждении заказа.
          </p>
        </section>

        {/* Payment */}
        <section className="checkout-card">
          <h2 className="checkout-card-title">Оплата</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {PAYMENT_OPTIONS.map((option) => (
              <label
                className="checkout-choice"
                data-checked={form.payment === option.id}
                key={option.id}
              >
                <input
                  checked={form.payment === option.id}
                  className="sr-only"
                  name="payment"
                  onChange={() => set("payment", option.id)}
                  type="radio"
                  value={option.id}
                />
                <span aria-hidden="true" className="checkout-choice-dot" />
                <span className="min-w-0">
                  <strong>{option.title}</strong>
                  <small>{option.note}</small>
                </span>
              </label>
            ))}
          </div>
        </section>

        <button
          className="bg-brand hover:bg-brand-strong flex min-h-[3.4rem] w-full items-center justify-center rounded-full px-6 text-[0.95rem] font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          Оформить заказ · {formatMoney({ amount: subtotal, currencyCode: "KGS" })}
        </button>
        <p className="text-muted text-center text-xs leading-relaxed">
          Нажимая «Оформить заказ», вы соглашаетесь с условиями доставки и
          возврата TOOLOR.
        </p>
      </div>

      {/* Summary */}
      <aside className="h-fit rounded-[1.5rem] bg-white p-6 shadow-[var(--shadow-soft)] md:p-8 lg:sticky lg:top-24">
        <p className="eyebrow text-muted">Ваш заказ</p>
        <ul className="divide-line mt-6 divide-y">
          {items.map((item) => (
            <li className="flex items-center gap-4 py-4" key={item.variantId}>
              <span className="bg-stone relative block aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-lg">
                <ResilientEditorialImage
                  images={(
                    item.imageUrls ?? (item.imageUrl ? [item.imageUrl] : [])
                  ).map((url, index) => ({
                    id: `${item.variantId}-${index}`,
                    url,
                    alt: item.name,
                  }))}
                  sizes="56px"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-ink line-clamp-2 block text-sm font-medium">
                  {item.name}
                </span>
                <span className="text-muted mt-0.5 block text-xs">
                  {item.variantTitle || "—"} · {item.quantity} шт.
                </span>
              </span>
              <span className="text-sm font-medium whitespace-nowrap">
                {formatMoney({
                  amount: item.unitAmount * item.quantity,
                  currencyCode: "KGS",
                })}
              </span>
            </li>
          ))}
        </ul>
        <dl className="border-line mt-2 space-y-3 border-t pt-5 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted">Товары ({itemCount})</dt>
            <dd>{formatMoney({ amount: subtotal, currencyCode: "KGS" })}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted">Доставка</dt>
            <dd className="text-muted">при подтверждении</dd>
          </div>
        </dl>
        <div className="border-line mt-5 flex items-baseline justify-between gap-4 border-t pt-5">
          <span className="text-sm font-semibold">Итого</span>
          <span className="text-2xl font-medium tracking-[-0.02em]">
            {formatMoney({ amount: subtotal, currencyCode: "KGS" })}
          </span>
        </div>
        <Link
          className="link-underline text-muted mt-6 inline-block pb-0.5 text-sm"
          href="/cart"
        >
          Изменить состав заказа
        </Link>
      </aside>
    </form>
  );
}
