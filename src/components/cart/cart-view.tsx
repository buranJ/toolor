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
import { formatMoney } from "@/lib/utils";

export function CartView() {
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
        action={{ href: "/catalog", label: "Перейти в каталог" }}
        description="Добавленные товары будут храниться только в этом браузере."
        title="Корзина пуста"
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
              href={`/product/${item.slug}`}
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
                href={`/product/${item.slug}`}
              >
                {item.name}
              </Link>
              <p className="text-muted mt-2 text-sm">
                Размер: {item.variantTitle || "—"}
              </p>
              <div className="border-line-strong mt-5 inline-flex items-center rounded-full border bg-white">
                <button
                  aria-label={`Уменьшить количество ${item.name}`}
                  className="size-10 rounded-full text-lg"
                  onClick={() => updateQuantity(item, item.quantity - 1)}
                  type="button"
                >
                  −
                </button>
                <output
                  className="min-w-9 text-center text-sm"
                  aria-label={`Количество ${item.name}`}
                >
                  {item.quantity}
                </output>
                <button
                  aria-label={`Увеличить количество ${item.name}`}
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
                Удалить
              </button>
            </div>
            <p className="col-start-2 text-base font-medium md:col-start-auto md:text-right">
              {formatMoney({
                amount: item.unitAmount * item.quantity,
                currencyCode: "KGS",
              })}
            </p>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-[1.5rem] bg-white p-6 shadow-[var(--shadow-soft)] md:p-8 lg:sticky lg:top-24">
        <p className="eyebrow text-muted">Сводка заказа</p>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted">
              Товары (
              {items.reduce((sum, item) => sum + item.quantity, 0)})
            </dt>
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
          className="bg-brand hover:bg-brand-strong shadow-[var(--shadow-soft)] mt-6 hidden min-h-[3.25rem] items-center justify-center rounded-full px-6 text-sm font-medium text-white transition-colors md:flex"
          href="/checkout"
        >
          Оформить заказ
        </Link>
        <p className="text-muted mt-5 text-xs leading-relaxed">
          Оплата наличными или картой при получении. Обмен и возврат — по
          правилам магазина.
        </p>
      </aside>

      <div className="border-line bg-paper fixed inset-x-0 bottom-0 z-40 border-t p-3 md:hidden">
        <Link
          className="bg-brand flex min-h-12 items-center justify-between rounded-full px-6 text-sm font-medium text-white"
          href="/checkout"
        >
          <span>Оформить</span>
          <span>{formatMoney({ amount: subtotal, currencyCode: "KGS" })}</span>
        </Link>
      </div>
    </div>
  );
}
