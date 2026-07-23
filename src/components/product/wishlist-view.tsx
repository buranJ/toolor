"use client";

import { useMemo, useSyncExternalStore } from "react";

import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  LOCAL_WISHLIST_KEY,
  readLocalWishlist,
} from "@/features/wishlist/local-wishlist";
import type { Product } from "@/types";

/** Russian plural for «товар»: [1, 2–4, 5+]. */
function productWord(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "товар";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "товара";
  return "товаров";
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("toolor-wishlist-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("toolor-wishlist-change", onStoreChange);
  };
}

export function WishlistView({ products }: { products: Product[] }) {
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
        action={{ href: "/catalog", label: "Смотреть каталог" }}
        description="Нажимайте на сердечко у товара — он появится здесь."
        title="Список пока пуст"
      />
    );
  }

  return (
    <>
      <p className="text-sm">
        <span className="text-ink font-semibold">{saved.length}</span>{" "}
        <span className="text-muted">{productWord(saved.length)}</span>
      </p>
      <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
        {saved.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}
