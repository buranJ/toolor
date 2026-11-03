// @vitest-environment node
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { inspectUploadedWorkbook } from "../../../scripts/import-toolor-products";

async function workbook(rows: (string | number)[][]) {
  const document = new ExcelJS.Workbook();
  const sheet = document.addWorksheet("Женская одежда");
  sheet.addRow(["Уникальный идентификатор товара", "Наименование товара", "Цена товара", "Ссылки на изображения товара (через запятую)"]);
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await document.xlsx.writeBuffer());
}

describe("admin workbook preview", () => {
  it("uses the same importer without changing the live catalog", async () => {
    const bytes = await workbook([["TW-1-1", "Женская куртка", 2990, "https://i.postimg.cc/photo.jpg"]]);
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
    await expect(inspectUploadedWorkbook(bytes, "duplicate.xlsx")).rejects.toThrow(/повторов SKU/);
  });
});
