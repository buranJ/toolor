"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  LOCAL_CART_KEY,
  readLocalCart,
  type LocalCartLine,
  writeLocalCart,
} from "@/features/cart/local-cart";

export function AddToCartButton({ line }: { line: LocalCartLine }) {
  const [added, setAdded] = useState(false);

  function add() {
    const cart = readLocalCart(window.localStorage.getItem(LOCAL_CART_KEY));
    const existing = cart.find((item) => item.variantId === line.variantId);
    const next = existing
      ? cart.map((item) =>
          item.variantId === line.variantId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      : [...cart, line];
    writeLocalCart(next);
    const drawer = document.querySelector<HTMLDialogElement>(".cart-drawer");
    if (drawer && !drawer.open) drawer.showModal();
    window.dispatchEvent(new Event("toolor-cart-open"));
    setAdded(true);
  }

  return (
    <Button className="w-full" onClick={add}>
      {added ? "Добавлено ✓" : "В корзину"}
    </Button>
  );
}
