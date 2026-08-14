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
import {
  format,
  getDictionary,
  localePath,
  type Dictionary,
  type Locale,
} from "@/i18n";
import { formatMoney } from "@/lib/utils";

const DELIVERY_OPTIONS = [
  { id: "bishkek", titleKey: "bishkekTitle", noteKey: "bishkekNote" },
  { id: "regions", titleKey: "regionsTitle", noteKey: "regionsNote" },
  {
    id: "international",
    titleKey: "internationalTitle",
    noteKey: "internationalNote",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  titleKey: keyof Dictionary["checkout"]["deliveryOptions"];
  noteKey: keyof Dictionary["checkout"]["deliveryOptions"];
}>;

const PAYMENT_OPTIONS = [
  { id: "cash", titleKey: "cashTitle", noteKey: "cashNote" },
  { id: "card", titleKey: "cardTitle", noteKey: "cardNote" },
] as const satisfies ReadonlyArray<{
  id: string;
  titleKey: keyof Dictionary["checkout"]["paymentOptions"];
  noteKey: keyof Dictionary["checkout"]["paymentOptions"];
}>;

type Errors = Partial<Record<"name" | "phone" | "city" | "address", string>>;

/**
 * Placeholder order reference until a real backend issues one. Kept at module
 * scope so the impure clock read stays outside the component, where the React
 * purity lint rule (which cannot tell a handler from render) would flag it.
 */
function nextOrderNumber(): string {
  return `TLR-${String(Date.now()).slice(-6)}`;
}

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

export function CheckoutForm({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);
  const copy = d.checkout;
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
    if (form.name.trim().length < 2) next.name = copy.errors.name;
    if (!/^[+()\-\s\d]{9,18}$/.test(form.phone.trim()))
      next.phone = copy.errors.phone;
    if (form.city.trim().length < 2) next.city = copy.errors.city;
    if (form.address.trim().length < 5) next.address = copy.errors.address;
    return next;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const number = nextOrderNumber();
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
        <h2 className="section-serif mt-8">{copy.successTitle}</h2>
        <p className="text-ink mt-4 text-lg font-medium">
          {format(copy.orderNumber, { number: orderNumber })}
        </p>
        <p className="text-muted mx-auto mt-4 max-w-md text-base leading-7">
          {copy.successText}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            className="bg-brand hover:bg-brand-strong flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-medium text-white transition-colors"
            href={localePath(locale, "/catalog")}
          >
            {copy.continueShopping}
          </Link>
          <Link
            className="border-ink/80 hover:bg-ink flex min-h-12 items-center justify-center rounded-full border px-7 text-sm font-medium transition-colors hover:text-white"
            href={localePath(locale, "/")}
          >
            {d.common.home}
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        action={{
          href: localePath(locale, "/catalog"),
          label: d.cart.goToCatalog,
        }}
        description={copy.emptyDescription}
        locale={locale}
        title={d.cart.emptyTitle}
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
          <h2 className="checkout-card-title">{copy.contacts}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="checkout-field sm:col-span-2">
              <span>{copy.fullName}</span>
              <input
                autoComplete="name"
                data-invalid={Boolean(errors.name)}
                name="name"
                onChange={(event) => set("name", event.target.value)}
                placeholder={copy.fullNamePlaceholder}
                type="text"
                value={form.name}
              />
              {errors.name ? <em>{errors.name}</em> : null}
            </label>
            <label className="checkout-field">
              <span>{copy.phone}</span>
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
              <span>{copy.email}</span>
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
          <h2 className="checkout-card-title">{copy.delivery}</h2>
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
                  <strong>{copy.deliveryOptions[option.titleKey]}</strong>
                  <small>{copy.deliveryOptions[option.noteKey]}</small>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-[0.8fr_1.2fr]">
            <label className="checkout-field">
              <span>{copy.city}</span>
              <input
                autoComplete="address-level2"
                data-invalid={Boolean(errors.city)}
                name="city"
                onChange={(event) => set("city", event.target.value)}
                placeholder={copy.cityPlaceholder}
                type="text"
                value={form.city}
              />
              {errors.city ? <em>{errors.city}</em> : null}
            </label>
            <label className="checkout-field">
              <span>{copy.address}</span>
              <input
                autoComplete="street-address"
                data-invalid={Boolean(errors.address)}
                name="address"
                onChange={(event) => set("address", event.target.value)}
                placeholder={copy.addressPlaceholder}
                type="text"
                value={form.address}
              />
              {errors.address ? <em>{errors.address}</em> : null}
            </label>
            <label className="checkout-field sm:col-span-2">
              <span>{copy.comment}</span>
              <input
                name="comment"
                onChange={(event) => set("comment", event.target.value)}
                placeholder={copy.commentPlaceholder}
                type="text"
                value={form.comment}
              />
            </label>
          </div>
          <p className="text-muted mt-5 text-sm leading-6">
            {copy.deliveryNote}
          </p>
        </section>

        {/* Payment */}
        <section className="checkout-card">
          <h2 className="checkout-card-title">{copy.payment}</h2>
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
                  <strong>{copy.paymentOptions[option.titleKey]}</strong>
                  <small>{copy.paymentOptions[option.noteKey]}</small>
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
          {format(copy.submit, {
            price: formatMoney(
              { amount: subtotal, currencyCode: "KGS" },
              locale,
            ),
          })}
        </button>
        <p className="text-muted text-center text-xs leading-relaxed">
          {copy.terms}
        </p>
      </div>

      {/* Summary */}
      <aside className="h-fit rounded-[1.5rem] bg-white p-6 shadow-[var(--shadow-soft)] md:p-8 lg:sticky lg:top-24">
        <p className="eyebrow text-muted">{copy.yourOrder}</p>
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
                  {item.variantTitle || "—"} · {item.quantity} {d.common.pieces}
                </span>
              </span>
              <span className="text-sm font-medium whitespace-nowrap">
                {formatMoney(
                  {
                    amount: item.unitAmount * item.quantity,
                    currencyCode: "KGS",
                  },
                  locale,
                )}
              </span>
            </li>
          ))}
        </ul>
        <dl className="border-line mt-2 space-y-3 border-t pt-5 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted">
              {format(d.cart.itemsCount, { count: itemCount })}
            </dt>
            <dd>
              {formatMoney({ amount: subtotal, currencyCode: "KGS" }, locale)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted">{d.cart.delivery}</dt>
            <dd className="text-muted">{d.cart.onConfirmation}</dd>
          </div>
        </dl>
        <div className="border-line mt-5 flex items-baseline justify-between gap-4 border-t pt-5">
          <span className="text-sm font-semibold">{d.cart.total}</span>
          <span className="text-2xl font-medium tracking-[-0.02em]">
            {formatMoney({ amount: subtotal, currencyCode: "KGS" }, locale)}
          </span>
        </div>
        <Link
          className="link-underline text-muted mt-6 inline-block pb-0.5 text-sm"
          href={localePath(locale, "/cart")}
        >
          {copy.editOrder}
        </Link>
      </aside>
    </form>
  );
}
