import { describe, expect, it } from "vitest";

import importedData from "@/data/toolor-products.generated.json";

import { generatedProductFileSchema } from "./toolor-product-schema";

describe("generated TOOLOR product data", () => {
  it("validates the generated provider payload and its source contract", () => {
    const parsed = generatedProductFileSchema.parse(importedData);

    expect(parsed.products).toHaveLength(60);
    expect(parsed.source.workbook).toBe("bd/Toolor_2026.08.21_1.xlsx");
    expect(parsed.source.sha256).toBe(
      "39b793432abc75b119a536edc756d694c8e77c639c2e5e850897774f5741fb38",
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
