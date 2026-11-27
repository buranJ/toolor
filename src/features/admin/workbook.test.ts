// @vitest-environment node
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { inspectUploadedWorkbook } from "../../../scripts/import-toolor-products";

async function workbook(rows: (string | number)[][]) {
  const document = new ExcelJS.Workbook();
  const sheet = document.addWorksheet("Женская одежда");
  sheet.addRow([
    "Уникальный идентификатор товара",
    "Наименование товара",
    "Цена товара",
    "Ссылки на изображения товара (через запятую)",
  ]);
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await document.xlsx.writeBuffer());
}

describe("admin workbook preview", () => {
  it("uses the same importer without changing the live catalog", async () => {
    const bytes = await workbook([
      ["TW-1-1", "Женская куртка", 2990, "https://i.postimg.cc/photo.jpg"],
    ]);
    const result = await inspectUploadedWorkbook(bytes, "new-catalog.xlsx");
    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({
      name: "Женская куртка",
      price: { amount: 299000, currencyCode: "KGS" },
      source: { workbook: "new-catalog.xlsx" },
    });
    expect(result.imageUrls).toEqual(["https://i.postimg.cc/photo.jpg"]);
  });

  it("rejects a duplicate SKU instead of silently dropping rows", async () => {
    const bytes = await workbook([
      ["TW-1-1", "Женская куртка", 2990, ""],
      ["TW-1-1", "Женская куртка", 2990, ""],
    ]);
    await expect(
      inspectUploadedWorkbook(bytes, "duplicate.xlsx"),
    ).rejects.toThrow(/повторов SKU/);
  });

  it("imports all assortment rows with parent SKUs and sale prices", async () => {
    const document = new ExcelJS.Workbook();
    const sheet = document.addWorksheet("Ассортимент");
    sheet.addRow([
      "Артикул",
      "Артикул варианта",
      "Название",
      "Категория",
      "Подкатегория",
      "Цена",
      "Цена со скидкой",
      "Скидка, %",
      "Размер",
      "Цвет",
      "Остаток",
      "Активен",
      "Описание",
      "Фото",
    ]);
    sheet.addRow([
      "TW-1",
      "TW-1-1",
      "Женская куртка",
      "Женское",
      "Куртки",
      3000,
      2500,
      17,
      "S",
      "Синий",
      3,
      "Да",
      "Описание",
      "https://i.postimg.cc/photo.jpg",
    ]);
    sheet.addRow([
      "TW-1",
      "TW-1-2",
      "Женская куртка",
      "Женское",
      "Куртки",
      0,
      null,
      null,
      "M",
      "Красный",
      0,
      "Да",
      "Описание",
      "https://i.postimg.cc/photo2.jpg",
    ]);
    sheet.addRow([
      "TM-2",
      "TM-2-1",
      "Мужская рубашка",
      "Мужское",
      "Рубашки",
      4000,
      null,
      null,
      "L",
      "Белый",
      2,
      "Нет",
      "Описание",
      "https://i.postimg.cc/hidden.jpg",
    ]);
    const result = await inspectUploadedWorkbook(
      Buffer.from(await document.xlsx.writeBuffer()),
      "assortment.xlsx",
    );
    expect(result.products).toHaveLength(2);
    const jacket = result.products.find(
      (product) => product.id === "product-tw-1",
    );
    expect(jacket).toMatchObject({
      id: "product-tw-1",
      categoryId: "category-women",
      productType: "Куртки и пуховики",
      price: { amount: 250000 },
      discountAmount: { amount: 50000 },
    });
    expect(jacket?.variants).toMatchObject([
      { sku: "TW-1-1", priceStatus: "known", price: { amount: 250000 } },
      { sku: "TW-1-2", priceStatus: "unknown", price: { amount: 0 } },
    ]);
    expect(result.imageUrls).toHaveLength(3);
    expect(
      result.products.some((product) => product.id === "product-tm-2"),
    ).toBe(true);
  });
});
