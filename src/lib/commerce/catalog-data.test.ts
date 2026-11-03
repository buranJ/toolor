// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { mockProducts } from "./mock/data";

vi.mock("@/features/admin/catalog-store", () => ({
  getActiveCatalog: vi.fn(async () => null),
  getPriorities: vi.fn(async () => ({
    productIds: [...mockProducts.map((product) => product.id)].reverse(),
    collectionIds: [],
  })),
}));

import { loadPublishedCatalog } from "./catalog-data";
import { MockCommerceProvider } from "./mock/provider";

describe("published catalog priority", () => {
  it("moves owner-ranked products to the front and promotes the first six", async () => {
    const provider = new MockCommerceProvider(loadPublishedCatalog);
    const result = await provider.getProducts({ pageSize: 10 });
    expect(result.items[0]?.id).toBe(mockProducts.at(-1)?.id);
    expect(result.items.slice(0, 6).every((product) => product.featured)).toBe(true);
    expect(result.items[6]?.featured).toBe(false);
  });
});
