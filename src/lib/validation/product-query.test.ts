import { describe, expect, it } from "vitest";

import { parseProductQuery } from "./product-query";

describe("parseProductQuery", () => {
  it("normalizes empty form controls to absent filters", () => {
    expect(
      parseProductQuery({
        category: "",
        collection: " ",
        gender: "women",
        minPrice: "",
        sort: "price-asc",
      }),
    ).toMatchObject({
      category: undefined,
      collection: undefined,
      gender: "women",
      minPrice: undefined,
      sort: "price-asc",
    });
  });

  it("keeps valid numeric and text filters", () => {
    expect(
      parseProductQuery({
        color: "  Черный ",
        maxPrice: "4500",
        page: "2",
      }),
    ).toMatchObject({
      color: "Черный",
      maxPrice: 450_000,
      page: 2,
    });
  });
});
