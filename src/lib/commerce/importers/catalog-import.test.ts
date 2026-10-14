// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildCandidates,
  normalizeRows,
  selectCandidates,
} from "../../../../scripts/import-toolor-products";

const headers = [
  "Уникальный идентификатор товара",
  "Наименование товара",
  "Цена товара",
  "Объединить карточки в одну по SKU",
  "Размер",
  "Название цвета от производителя",
  "Состав материала в %",
  "Серия/линейка",
];
function row(
  sku: string,
  name: string,
  price: string,
  sheet = "Unisex",
  group = sku,
  color = "Синий",
  size = "S",
) {
  return {
    sheet,
    rowNumber: 2,
    headers,
    values: [sku, name, price, group, size, color, "100% хлопок", "RUH"],
  };
}

describe("marketplace catalog import", () => {
  it("retains incomplete products without inventing prices, images or descriptions", () => {
    const normalized = normalizeRows([
      row("TW-305-1", "Ветровка-полузамок (Синий, S)", "", "Ветровки(ж)"),
    ]);
    expect(normalized.rejectedRows).toEqual([]);
    const { selected } = selectCandidates(buildCandidates(normalized.rows));
    expect(selected).toHaveLength(1);
    expect(selected[0]?.product).toMatchObject({
      name: "Ветровка-полузамок",
      priceStatus: "unknown",
      description: "",
      images: [],
      categoryId: "category-women",
      productType: "Куртки и пуховики",
    });
    expect(selected[0]?.product.fallbacks).toContain("price-missing");
  });
  it("reads new color/material headers and retains all explicitly grouped variants", () => {
    const rows = normalizeRows([
      row(
        "ТМ-412-1",
        'Свитшот "Горы" (Синий, S)',
        "3150.00",
        "Unisex",
        "ТМ-412-1,ТМ-412-2",
      ),
      {
        ...row(
          "ТМ-412-2",
          'Свитшот "Горы" (Белый(вышивка), M)',
          "3250.00",
          "Unisex",
          "ТМ-412-2,ТМ-412-1",
          "Белый(вышивка)",
          "M",
        ),
        rowNumber: 3,
      },
    ]).rows;
    const candidates = buildCandidates(rows);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.product).toMatchObject({
      name: 'Свитшот "Горы"',
      material: "100% хлопок",
      collectionName: "RUH",
      categoryId: "category-unisex",
      price: { amount: 315000, currencyCode: "KGS" },
    });
    expect(candidates[0]?.product.variants.map((v) => v.price.amount)).toEqual([
      315000, 325000,
    ]);
    expect(candidates[0]?.product.colors).toEqual(["Синий", "Белый(вышивка)"]);
  });
  it("does not collide Cyrillic, Latin and prefix-less SKU identities", () => {
    const rows = normalizeRows(
      ["ТМ-127-1", "TW-127-1", "TM-127-1", "127-1"].map((sku) =>
        row(sku, "Толстовка", "1000"),
      ),
    ).rows;
    const products = buildCandidates(rows).map((c) => c.product);
    expect(new Set(products.map((p) => p.id)).size).toBe(4);
    expect(new Set(products.map((p) => p.slug)).size).toBe(4);
    expect(products.find((p) => p.variants[0]?.sku === "TM-127-1")?.slug).toBe(
      "toolor-tm-127-1",
    );
  });
  it("rejects invalid non-empty prices and duplicate SKUs rather than silently replacing data", () => {
    const result = normalizeRows([
      row("SKU-1", "Модель", "invalid"),
      row("SKU-2", "Модель", "1000"),
      { ...row("SKU-2", "Модель", "1000"), rowNumber: 3 },
    ]);
    expect(result.rejectedRows).toHaveLength(1);
    expect(result.duplicateRows).toHaveLength(1);
  });
});
