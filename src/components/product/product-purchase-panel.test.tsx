import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LOCAL_CART_KEY, readLocalCart } from "@/features/cart/local-cart";
import { ProductPurchasePanel } from "./product-purchase-panel";

vi.mock("./wishlist-toggle", () => ({ WishlistToggle: () => null }));
const price = { amount: 100_000, currencyCode: "KGS" as const };
const product: ComponentProps<typeof ProductPurchasePanel>["product"] = {
  id: "fixture",
  slug: "fixture",
  name: "Test product",
  images: [],
  colors: ["Белый", "Черный"],
  variants: [
    {
      id: "white-no-size",
      title: "Белый",
      sku: "0",
      availableForSale: true,
      price,
      options: { color: "Белый" },
    },
    {
      id: "white-s",
      title: "Белый / S",
      sku: "1",
      availableForSale: true,
      price,
      options: { color: "Белый", size: "S" },
    },
    {
      id: "black-no-size",
      title: "Черный",
      sku: "2",
      availableForSale: true,
      price,
      options: { color: "Черный" },
    },
    {
      id: "black-m",
      title: "Черный / M",
      sku: "3",
      availableForSale: true,
      price,
      options: { color: "Черный", size: "M" },
    },
  ],
};
beforeEach(() => localStorage.clear());
describe("purchase variant selection", () => {
  it("starts with a visible sized variant, never the hidden duplicate", () => {
    render(<ProductPurchasePanel locale="ru" product={product} />);
    expect(screen.getByRole("radio", { name: "S" })).toBeChecked();
    fireEvent.click(screen.getAllByRole("button", { name: /В корзину/ })[0]!);
    expect(
      readLocalCart(localStorage.getItem(LOCAL_CART_KEY))[0]?.variantId,
    ).toBe("white-s");
  });
  it("selects a real size when changing to a colour without the current size", () => {
    render(<ProductPurchasePanel locale="ru" product={product} />);
    fireEvent.click(screen.getByRole("radio", { name: "Черный" }));
    expect(screen.getByRole("radio", { name: "M" })).toBeChecked();
    fireEvent.click(screen.getAllByRole("button", { name: /В корзину/ })[0]!);
    expect(
      readLocalCart(localStorage.getItem(LOCAL_CART_KEY))[0]?.variantId,
    ).toBe("black-m");
  });
});
