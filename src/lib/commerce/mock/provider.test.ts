import { beforeEach, describe, expect, it } from "vitest";

import { mockProducts } from "./data";
import { MockCommerceProvider } from "./provider";

describe("MockCommerceProvider", () => {
  let provider: MockCommerceProvider;

  beforeEach(() => {
    provider = new MockCommerceProvider();
  });

  it("filters and sorts products through typed criteria", async () => {
    const result = await provider.getProducts({
      category: "women",
      sort: "price-asc",
    });

    expect(result.items.length).toBeGreaterThan(1);
    expect(result.items[0]?.price.amount).toBeLessThanOrEqual(
      result.items[1]?.price.amount ?? 0,
    );
    expect(
      result.items.every((product) => product.dataSource === "spreadsheet"),
    ).toBe(true);
  });

  it("filters imported products by gender, size and color", async () => {
    const target = mockProducts.find(
      (product) =>
        product.gender !== "unknown" &&
        product.sizes?.length &&
        product.colors?.length,
    );
    expect(target).toBeDefined();
    if (!target?.gender || !target.sizes?.[0] || !target.colors?.[0]) {
      throw new Error("Expected a complete imported product");
    }

    const result = await provider.getProducts({
      gender: target.gender,
      size: target.sizes[0],
      color: target.colors[0],
      pageSize: 100,
    });

    expect(result.items).toContainEqual(
      expect.objectContaining({ id: target.id }),
    );
    expect(
      result.items.every((product) => product.gender === target.gender),
    ).toBe(true);
  });

  it("finds a catalog category through its source product type", async () => {
    const result = await provider.getProducts({
      search: "Куртки и пуховики",
      pageSize: 100,
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(
      result.items.every(
        (product) => product.productType === "Куртки и пуховики",
      ),
    ).toBe(true);
  });

  it("returns a product by slug and null for an unknown slug", async () => {
    const product = mockProducts[0];
    expect(product).toBeDefined();
    if (!product) throw new Error("Expected imported product fixture");
    await expect(
      provider.getProductBySlug(product.slug),
    ).resolves.toMatchObject({
      name: product.name,
    });
    await expect(provider.getProductBySlug("missing")).resolves.toBeNull();
  });

  it("supports the cart mutation lifecycle", async () => {
    const cart = await provider.createCart();
    const product = await provider.getProductBySlug(
      mockProducts[0]?.slug ?? "",
    );
    const variant = product?.variants[0];
    expect(variant).toBeDefined();
    if (!variant) throw new Error("Expected mock variant");

    const added = await provider.addCartItem(cart.id, variant.id, 2);
    expect(added.totalQuantity).toBe(2);
    expect(added.subtotal.amount).toBe(variant.price.amount * 2);

    const item = added.items[0];
    expect(item).toBeDefined();
    if (!item) throw new Error("Expected mock item");

    const updated = await provider.updateCartItem(cart.id, item.id, 1);
    expect(updated.totalQuantity).toBe(1);

    const emptied = await provider.removeCartItem(cart.id, item.id);
    expect(emptied.items).toEqual([]);
  });

  it("supports wishlist add and remove", async () => {
    const product = await provider.getProductBySlug(
      mockProducts[0]?.slug ?? "",
    );
    expect(product).not.toBeNull();
    if (!product) throw new Error("Expected mock product");

    const added = await provider.addWishlistItem(product.id);
    expect(added).toHaveLength(1);

    const removed = await provider.removeWishlistItem(product.id);
    expect(removed).toEqual([]);
  });
});
