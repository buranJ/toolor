import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockProducts } from "@/lib/commerce/mock";
import { ProductCard } from "./product-card";

describe("catalog photo loading", () => {
  it("does not mount an alternate image until keyboard interaction and preserves the primary on failure", () => {
    const product = mockProducts[0];
    if (!product?.images[1]) throw new Error("Missing image fixture");
    const { container } = render(<ProductCard locale="ru" product={product} />);
    expect(container.querySelectorAll("img")).toHaveLength(1);
    fireEvent.focus(screen.getAllByRole("link")[0]!);
    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(2);
    fireEvent.error(images[1]!);
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      product.images[0]?.alt,
    );
  });
  it("shows an explicit unknown price instead of a free product", () => {
    const product = mockProducts.find((p) => p.priceStatus === "unknown");
    if (!product) throw new Error("Missing unknown-price fixture");
    render(<ProductCard locale="ru" product={product} />);
    expect(screen.getByText("Цена уточняется")).toBeVisible();
    expect(screen.queryByText(/0 сом/)).not.toBeInTheDocument();
  });
});
