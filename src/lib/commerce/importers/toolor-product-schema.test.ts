import { describe, expect, it } from "vitest";

import importedData from "@/data/toolor-products.generated.json";

import { generatedProductFileSchema } from "./toolor-product-schema";

describe("generated TOOLOR product data", () => {
  it("validates the generated provider payload and its source contract", () => {
    const parsed = generatedProductFileSchema.parse(importedData);

    expect(parsed.products).toHaveLength(24);
    expect(parsed.source.workbook).toBe("docs/data-toolor.xlsx");
    expect(parsed.source.sha256).toBe(
      "d742bdfc14b2d3011d4bc302cecc163e60a9a2217c9186111d4f358cf763e2e6",
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
