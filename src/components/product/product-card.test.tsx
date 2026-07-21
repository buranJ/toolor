import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { mockProducts } from "@/lib/commerce/mock";

import { ProductCard } from "./product-card";

describe("ProductCard", () => {
  it("renders accessible mock product information and a detail link", () => {
    const product = mockProducts[0];
    expect(product).toBeDefined();
    if (!product) throw new Error("Expected mock product fixture");

    render(<ProductCard product={product} />);

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
          (link) => link.getAttribute("href") === `/product/${product.slug}`,
        ),
    ).toBe(true);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      product.images[0]?.alt,
    );
  });
});
