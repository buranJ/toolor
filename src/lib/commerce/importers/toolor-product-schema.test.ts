import { describe, expect, it } from "vitest";

import importedData from "@/data/toolor-products.generated.json";

import { generatedProductFileSchema } from "./toolor-product-schema";

describe("generated TOOLOR product data", () => {
  it("validates the generated provider payload and its source contract", () => {
    const parsed = generatedProductFileSchema.parse(importedData);

    expect(parsed.products).toHaveLength(7);
    expect(parsed.source.workbook).toBe("bd/Toolor_2026.08.06_1.xlsx");
    expect(parsed.source.sha256).toBe(
      "a62c8f282e940b6c8014a1d361ccc0b714b6125a512982ff5031c15181f19bf8",
    );
    expect(
      parsed.products.every(
        (product) =>
          product.dataSource === "spreadsheet" &&
          product.variants.length > 0 &&
          product.price.amount > 0,
      ),
    ).toBe(true);
  });

  it("keeps unavailable source data explicit", () => {
    const parsed = generatedProductFileSchema.parse(importedData);

    expect(
      parsed.products.every((product) =>
        product.variants.every(
          (variant) =>
            variant.availableForSale === false &&
            variant.availabilityStatus === "unknown",
        ),
      ),
    ).toBe(true);
    expect(
      parsed.products.every((product) => product.source.productUrl === null),
    ).toBe(true);
  });
});
