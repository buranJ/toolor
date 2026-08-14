import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { mockProducts } from "@/lib/commerce/mock";

import { ProductCard } from "./product-card";

describe("ProductCard", () => {
  it("renders accessible mock product information and a locale-prefixed detail link", () => {
    const product = mockProducts[0];
    expect(product).toBeDefined();
    if (!product) throw new Error("Expected mock product fixture");

    render(<ProductCard locale="ru" product={product} />);

    expect(
      screen.getByRole("heading", { name: product.name }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(product.productType ?? "TOOLOR"),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link")
        .every(
          (link) => link.getAttribute("href") === `/ru/product/${product.slug}`,
        ),
    ).toBe(true);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      product.images[0]?.alt,
    );
  });

  it("prefixes the detail link with whichever locale is active", () => {
    const product = mockProducts[0];
    if (!product) throw new Error("Expected mock product fixture");

    render(<ProductCard locale="ky" product={product} />);

    expect(
      screen
        .getAllByRole("link")
        .every(
          (link) => link.getAttribute("href") === `/ky/product/${product.slug}`,
        ),
    ).toBe(true);
  });
});
