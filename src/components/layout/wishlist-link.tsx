"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import {
  LOCAL_WISHLIST_KEY,
  readLocalWishlist,
} from "@/features/wishlist/local-wishlist";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("toolor-wishlist-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("toolor-wishlist-change", onStoreChange);
  };
}

export function WishlistLink() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(LOCAL_WISHLIST_KEY) ?? "",
    () => "",
  );
  const count = useMemo(() => readLocalWishlist(snapshot).length, [snapshot]);

  return (
    <Link
      aria-label={count > 0 ? `Избранное, товаров: ${count}` : "Избранное"}
      className="summit-icon-link relative"
      href="/wishlist"
    >
      ♡
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="bg-brand absolute -top-1 -right-2 grid size-4 place-items-center rounded-full text-[0.58rem] leading-none font-semibold text-white"
        >
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
