"use client";

import { useState } from "react";

export function WishlistToggle({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [active, setActive] = useState(false);

  return (
    <button
      aria-label={`${active ? "Удалить" : "Добавить"} ${productName} ${active ? "из" : "в"} избранное`}
      aria-pressed={active}
      className="bg-white/90 hover:bg-brand flex size-10 items-center justify-center rounded-full text-lg shadow-[var(--shadow-soft)] backdrop-blur-sm transition-colors hover:text-white"
      data-product-id={productId}
      onClick={() => setActive((value) => !value)}
      type="button"
    >
      <span aria-hidden="true">{active ? "♥" : "♡"}</span>
    </button>
  );
}
