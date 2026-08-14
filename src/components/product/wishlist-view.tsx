"use client";

import { useMemo, useSyncExternalStore } from "react";

import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  LOCAL_WISHLIST_KEY,
  readLocalWishlist,
} from "@/features/wishlist/local-wishlist";
import { getDictionary, localePath, plural, type Locale } from "@/i18n";
import type { Product } from "@/types";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("toolor-wishlist-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("toolor-wishlist-change", onStoreChange);
  };
}

export function WishlistView({
  locale,
  products,
}: {
  locale: Locale;
  products: Product[];
}) {
  const d = getDictionary(locale);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(LOCAL_WISHLIST_KEY) ?? "",
    () => "",
  );
  const ids = useMemo(() => readLocalWishlist(snapshot), [snapshot]);
  const saved = useMemo(
    () => products.filter((product) => ids.includes(product.id)),
    [products, ids],
  );

  if (saved.length === 0) {
    return (
      <EmptyState
        action={{
          href: localePath(locale, "/catalog"),
          label: d.wishlist.emptyAction,
        }}
        description={d.wishlist.emptyDescription}
        locale={locale}
        title={d.wishlist.emptyTitle}
      />
    );
  }

  return (
    <>
      <p className="text-sm">
        <span className="text-ink font-semibold">{saved.length}</span>{" "}
        <span className="text-muted">
          {plural(locale, saved.length, d.common.productCount)}
        </span>
      </p>
      <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
        {saved.map((product) => (
          <ProductCard key={product.id} locale={locale} product={product} />
        ))}
      </div>
    </>
  );
}
