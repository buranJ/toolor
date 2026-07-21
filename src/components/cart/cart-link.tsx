"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import { LOCAL_CART_KEY, readLocalCart } from "@/features/cart/local-cart";

function BagIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-[1.05rem]"
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="M5.5 7V5.5a4.5 4.5 0 0 1 9 0V7m-11 0h13l1 11h-15l1-11Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function CartLink({ compact = false }: { compact?: boolean }) {
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
  const quantity = useMemo(
    () =>
      readLocalCart(snapshot).reduce((total, item) => total + item.quantity, 0),
    [snapshot],
  );

  return (
    <Link
      aria-label={`Корзина, ${quantity} товаров`}
      className={compact ? "header-cart-compact" : "summit-service-link"}
      href="/cart"
    >
      {compact ? <BagIcon /> : "Корзина"}
      <span aria-hidden="true" aria-live="polite">
        {compact ? quantity : ` (${quantity})`}
      </span>
    </Link>
  );
}
