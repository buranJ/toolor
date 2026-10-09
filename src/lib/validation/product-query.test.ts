import { describe, expect, it } from "vitest";

import { parseProductQuery } from "./product-query";

describe("parseProductQuery", () => {
  it("ignores invalid external filters instead of crashing the route", () => {
    expect(
      parseProductQuery({
        gender: "invalid",
        minPrice: "oops",
        maxPrice: "-1",
        size: "x".repeat(41),
        page: "Infinity",
      }),
    ).toMatchObject({
      gender: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      size: undefined,
      page: 1,
    });
  });

  it("bounds search text and takes the first repeated query value", () => {
    expect(
      parseProductQuery({ q: ["a".repeat(101), "ignored"] }).search,
    ).toHaveLength(100);
  });

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
