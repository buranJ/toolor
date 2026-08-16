import { describe, expect, it } from "vitest";

import { readLocalCart } from "./local-cart";

const baseLine = {
  productId: "product-1",
  slug: "product-1",
  name: "Product",
  variantId: "variant-1",
  quantity: 1,
  unitAmount: 129000,
  currencyCode: "KGS",
} as const;

describe("readLocalCart", () => {
  it("keeps cart lines that use local product image paths", () => {
    const value = JSON.stringify([
      {
        ...baseLine,
        imageUrl: "/imgs/01.webp",
        imageUrls: ["/imgs/01.webp", "/imgs/02.webp"],
      },
    ]);

    expect(readLocalCart(value)).toEqual([
      {
        ...baseLine,
        imageUrl: "/imgs/01.webp",
        imageUrls: ["/imgs/01.webp", "/imgs/02.webp"],
      },
    ]);
  });

  it("keeps cart lines that use absolute HTTP image URLs", () => {
    const value = JSON.stringify([
      {
        ...baseLine,
        imageUrl: "https://example.com/product.webp",
      },
    ]);

    expect(readLocalCart(value)).toHaveLength(1);
  });

  it("rejects unsafe image URL schemes", () => {
    const value = JSON.stringify([
      {
        ...baseLine,
        imageUrl: "javascript:alert(1)",
      },
    ]);

    expect(readLocalCart(value)).toEqual([]);
  });
});
