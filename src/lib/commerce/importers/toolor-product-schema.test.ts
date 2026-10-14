import { describe, expect, it } from "vitest";

import importedData from "@/data/toolor-products.generated.json";

import { generatedProductFileSchema } from "./toolor-product-schema";

describe("generated TOOLOR product data", () => {
  it("validates the generated provider payload and its source contract", () => {
    const parsed = generatedProductFileSchema.parse(importedData);

    expect(parsed.products).toHaveLength(49);
    expect(parsed.products.flatMap((product) => product.variants)).toHaveLength(
      494,
    );
    expect(parsed.source.workbook).toBe("marketplace_catalog.xlsx");
    expect(parsed.source.sha256).toBe(
      "9dfc73c59022c13f46e128a94ea6ed66145ce0433255e300d80887b36a6c406a",
    );
    expect(
      parsed.products.every(
        (product) =>
          product.dataSource === "spreadsheet" &&
          product.variants.length > 0 &&
          (product.price.amount > 0 || product.priceStatus === "unknown"),
      ),
    ).toBe(true);
  });

  it("preserves all SKUs, including Cyrillic prefixes, without identity collisions", () => {
    const { products } = generatedProductFileSchema.parse(importedData);
    const variants = products.flatMap((p) => p.variants);
    expect(new Set(variants.map((v) => v.sku)).size).toBe(494);
    expect(new Set(variants.map((v) => v.id)).size).toBe(494);
    expect(new Set(products.map((p) => p.id)).size).toBe(49);
    expect(new Set(products.map((p) => p.slug)).size).toBe(49);
    expect(variants.some((v) => v.sku === "ТМ-412-1")).toBe(true);
    expect(variants.some((v) => v.sku === "ТМ-131-TM-131-6")).toBe(true);
    expect(products.find((p) => p.source.sheet === "Unisex")?.categoryId).toBe(
      "category-unisex",
    );
    expect(
      products.every((p) =>
        p.variants.every((v) => p.source.originalSkus.includes(v.sku)),
      ),
    ).toBe(true);
  });

  it("has decoded local photos only and explicitly preserves missing source prices", () => {
    const { products } = generatedProductFileSchema.parse(importedData);
    const images = products.flatMap((p) => p.images);
    expect(new Set(images.map((i) => i.url)).size).toBe(448);
    expect(
      images.every(
        (i) =>
          /^\/media\/products\/[a-f0-9]{24}\.webp$/.test(i.url) &&
          i.status === "reachable",
      ),
    ).toBe(true);
    const unknown = products.filter((p) => p.priceStatus === "unknown");
    expect(unknown).toHaveLength(1);
    expect(unknown[0]?.name).toBe("Ветровка-полузамок");
    expect(unknown[0]?.variants).toHaveLength(12);
    expect(unknown[0]?.images).toHaveLength(0);
    expect(unknown[0]?.fallbacks).toContain("price-missing");
    expect(unknown[0]?.variants.every((v) => v.priceStatus === "unknown")).toBe(
      true,
    );
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
