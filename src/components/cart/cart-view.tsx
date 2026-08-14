"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { EmptyState } from "@/components/ui/empty-state";
import {
  LOCAL_CART_KEY,
  readLocalCart,
  type LocalCartLine,
  writeLocalCart,
} from "@/features/cart/local-cart";
import { format, getDictionary, localePath, type Locale } from "@/i18n";
import { formatMoney } from "@/lib/utils";

export function CartView({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);
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

  function updateQuantity(item: LocalCartLine, quantity: number) {
    if (quantity < 1) {
      writeLocalCart(
        items.filter((entry) => entry.variantId !== item.variantId),
      );
      return;
    }
    writeLocalCart(
      items.map((entry) =>
        entry.variantId === item.variantId ? { ...entry, quantity } : entry,
      ),
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        action={{
          href: localePath(locale, "/catalog"),
          label: d.cart.goToCatalog,
        }}
        description={d.cart.emptyDescription}
        locale={locale}
        title={d.cart.emptyTitle}
      />
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1.7fr)_minmax(20rem,0.8fr)]">
      <ul className="divide-line border-line divide-y border-y">
        {items.map((item) => (
          <li
            className="grid grid-cols-[7.5rem_1fr] gap-5 py-6 md:grid-cols-[13rem_1fr_auto] md:gap-8"
            key={item.variantId}
          >
            <Link
              className="bg-stone relative aspect-[3/4] overflow-hidden rounded-[1.25rem]"
              href={localePath(locale, `/product/${item.slug}`)}
            >
              <ResilientEditorialImage
                images={(
                  item.imageUrls ?? (item.imageUrl ? [item.imageUrl] : [])
                ).map((url, index) => ({
                  id: `${item.variantId}-${index}`,
                  url,
                  alt: item.name,
                }))}
                sizes="(max-width: 768px) 120px, 208px"
              />
            </Link>
            <div className="min-w-0">
              <p className="mono-meta text-muted">TOOLOR</p>
              <Link
                className="hover:text-brand mt-2 block text-base font-medium tracking-[-0.01em] md:text-xl"
                href={localePath(locale, `/product/${item.slug}`)}
              >
                {item.name}
              </Link>
              <p className="text-muted mt-2 text-sm">
                {d.cart.size}: {item.variantTitle || "—"}
              </p>
              <div className="border-line-strong mt-5 inline-flex items-center rounded-full border bg-white">
                <button
                  aria-label={format(d.cart.decrease, { name: item.name })}
                  className="size-10 rounded-full text-lg"
                  onClick={() => updateQuantity(item, item.quantity - 1)}
                  type="button"
                >
                  −
                </button>
                <output
                  className="min-w-9 text-center text-sm"
                  aria-label={format(d.cart.quantity, { name: item.name })}
                >
                  {item.quantity}
                </output>
                <button
                  aria-label={format(d.cart.increase, { name: item.name })}
                  className="size-10 rounded-full text-lg"
                  onClick={() => updateQuantity(item, item.quantity + 1)}
                  type="button"
                >
                  +
                </button>
              </div>
              <button
                className="text-muted mt-5 block border-b border-current text-xs"
                onClick={() => updateQuantity(item, 0)}
                type="button"
              >
                {d.cart.remove}
              </button>
            </div>
            <p className="col-start-2 text-base font-medium md:col-start-auto md:text-right">
              {formatMoney(
                {
                  amount: item.unitAmount * item.quantity,
                  currencyCode: "KGS",
                },
                locale,
              )}
            </p>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-[1.5rem] bg-white p-6 shadow-[var(--shadow-soft)] md:p-8 lg:sticky lg:top-24">
        <p className="eyebrow text-muted">{d.cart.summary}</p>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted">
              {format(d.cart.itemsCount, {
                count: items.reduce((sum, item) => sum + item.quantity, 0),
              })}
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
          className="bg-brand hover:bg-brand-strong mt-6 hidden min-h-[3.25rem] items-center justify-center rounded-full px-6 text-sm font-medium text-white shadow-[var(--shadow-soft)] transition-colors md:flex"
          href={localePath(locale, "/checkout")}
        >
          {d.cart.checkout}
        </Link>
        <p className="text-muted mt-5 text-xs leading-relaxed">
          {d.cart.paymentNote}
        </p>
      </aside>

      <div className="border-line bg-paper fixed inset-x-0 bottom-0 z-40 border-t p-3 md:hidden">
        <Link
          className="bg-brand flex min-h-12 items-center justify-between rounded-full px-6 text-sm font-medium text-white"
          href={localePath(locale, "/checkout")}
        >
          <span>{d.cart.checkoutShort}</span>
          <span>
            {formatMoney({ amount: subtotal, currencyCode: "KGS" }, locale)}
          </span>
        </Link>
      </div>
    </div>
  );
}
