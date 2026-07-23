"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  LOCAL_WISHLIST_KEY,
  readLocalWishlist,
  writeLocalWishlist,
} from "@/features/wishlist/local-wishlist";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("toolor-wishlist-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("toolor-wishlist-change", onStoreChange);
  };
}

export function WishlistToggle({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(LOCAL_WISHLIST_KEY) ?? "",
    () => "",
  );
  const ids = useMemo(() => readLocalWishlist(snapshot), [snapshot]);
  const active = ids.includes(productId);

  function toggle() {
    writeLocalWishlist(
      active ? ids.filter((id) => id !== productId) : [...ids, productId],
    );
  }

  return (
    <button
      aria-label={`${active ? "Удалить" : "Добавить"} ${productName} ${active ? "из избранного" : "в избранное"}`}
      aria-pressed={active}
      className={`hover:bg-brand flex size-10 items-center justify-center rounded-full bg-white/90 shadow-[var(--shadow-soft)] backdrop-blur-sm transition-colors hover:text-white ${
        active ? "text-brand" : "text-ink"
      }`}
      data-product-id={productId}
      onClick={toggle}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="size-[1.15rem]"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20.6S4.6 15.9 2.7 11.6a5.3 5.3 0 0 1 9.3-5 5.3 5.3 0 0 1 9.3 5c-1.9 4.3-9.3 9-9.3 9z" />
      </svg>
    </button>
  );
}
