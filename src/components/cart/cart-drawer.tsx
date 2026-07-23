"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { LOCAL_CART_KEY, readLocalCart } from "@/features/cart/local-cart";
import { formatMoney } from "@/lib/utils";

export function CartDrawer() {
  const dialogRef = useRef<HTMLDialogElement>(null);
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
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitAmount * item.quantity,
    0,
  );

  useEffect(() => {
    function open() {
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    }
    window.addEventListener("toolor-cart-open", open);
    return () => window.removeEventListener("toolor-cart-open", open);
  }, []);

  return (
    <dialog
      className="cart-drawer bg-paper ml-auto h-full max-h-none w-full max-w-[34rem] overflow-hidden rounded-l-[1.5rem] border-0 p-0"
      ref={dialogRef}
    >
      <div className="flex h-full flex-col">
        <div className="border-line flex items-center justify-between border-b p-5 md:px-7">
          <p className="mono-meta">Корзина / {items.length}</p>
          <button
            aria-label="Закрыть корзину"
            className="hover:bg-ink border-line-strong size-10 rounded-full border text-xl transition-colors hover:text-white"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 md:px-7">
          {items.length ? (
            <ul className="divide-line divide-y">
              {items.map((item) => (
                <li
                  className="grid grid-cols-[6rem_1fr] gap-4 py-5"
                  key={item.variantId}
                >
                  <Link
                    href={`/product/${item.slug}`}
                    onClick={() => dialogRef.current?.close()}
                    className="bg-stone relative aspect-[3/4] overflow-hidden rounded-[1rem]"
                  >
                    <ResilientEditorialImage
                      images={(
                        item.imageUrls ?? (item.imageUrl ? [item.imageUrl] : [])
                      ).map((url, index) => ({
                        id: `${item.variantId}-${index}`,
                        url,
                        alt: item.name,
                      }))}
                      sizes="96px"
                      fallbackLabel="TOOLOR"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-col">
                    <Link
                      className="hover:text-brand text-sm leading-snug font-medium transition-colors"
                      href={`/product/${item.slug}`}
                      onClick={() => dialogRef.current?.close()}
                    >
                      {item.name}
                    </Link>
                    <p className="text-muted mt-1.5 text-xs">
                      {item.variantTitle ?? "—"} · {item.quantity}{" "}
                      шт.
                    </p>
                    <p className="mt-auto pt-3 text-sm font-medium">
                      {formatMoney({
                        amount: item.unitAmount * item.quantity,
                        currencyCode: "KGS",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted py-10 text-sm">Корзина пуста.</p>
          )}
        </div>
        <div className="border-line border-t bg-white p-5 md:p-7">
          <div className="flex items-baseline justify-between">
            <span className="mono-meta text-muted">Подытог</span>
            <span className="text-lg font-medium">
              {formatMoney({ amount: subtotal, currencyCode: "KGS" })}
            </span>
          </div>
          <p className="text-muted mt-2 text-xs leading-5">
            Доставка рассчитывается при оформлении заказа.
          </p>
          <Link
            className="bg-brand hover:bg-brand-strong shadow-[var(--shadow-soft)] mt-5 flex min-h-[3.25rem] items-center justify-center rounded-full px-6 text-sm font-medium text-white transition-colors"
            href="/cart"
            onClick={() => dialogRef.current?.close()}
          >
            Открыть корзину
          </Link>
          <button
            className="mt-3 w-full py-2 text-xs tracking-[0.12em] uppercase hover:opacity-60"
            onClick={() => dialogRef.current?.close()}
            type="button"
          >
            Продолжить покупки
          </button>
        </div>
      </div>
    </dialog>
  );
}
