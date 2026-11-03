import { createHash } from "node:crypto";

import ExcelJS, { type CellValue } from "exceljs";

import type { ImportedProduct } from "./toolor-product-schema";

const SOURCE_LABEL = "marketplace_catalog.xlsx";

const BASE_HEADERS = {
  sku: ["уникальный идентификатор товара", "sku", "артикул"],
  name: ["наименование товара", "название товара"],
  description: ["описание товара", "описание"],
  price: ["цена товара", "цена"],
  discount: ["сумма скидки", "скидка"],
  images: ["ссылки на изображения товара (через запятую)", "изображения"],
  group: ["объединить карточки в одну по sku"],
  main: ["главный товар"],
  size: [
    "размер производителя",
    "международный размер",
    "размер",
    "размер головного убора",
  ],
  color: ["название цвета от производителя", "цвет", "цвет для фильтра"],
  material: [
    "состав материала в %",
    "состав",
    "состав материала",
    "материал",
    "материал верха",
    "тип ткани",
  ],
  collection: ["серия/линейка", "коллекция"],
  gender: ["пол"],
  productUrl: ["ссылка на товар", "url товара", "ссылка на карточку товара"],
  care: ["уход", "рекомендации по уходу"],
  modelHeight: ["рост модели на фото", "рост модели"],
  modelSize: ["размер на модели на фото", "размер на модели"],
} as const;

type Gender = "men" | "women" | "unisex" | "unknown";
type Fallback = ImportedProduct["fallbacks"][number];

interface RawWorkbookRow {
  sheet: string;
  rowNumber: number;
  headers: string[];
  values: string[];
}

interface SheetSummary {
  name: string;
  state: "visible" | "veryHidden";
  rowCount: number;
  headers: string[];
}

interface RejectedRow {
  sheet: string;
  row: number;
  sku: string;
  reason: string;
}

interface InvalidLink {
  sheet: string;
  row: number;
  value: string;
  reason: string;
}

interface NormalizedVariantRow {
  sheet: string;
  rowNumber: number;
  sku: string;
  name: string;
  description: string;
  priceAmount: number;
  priceStatus: "known" | "unknown";
  discountAmount?: number;
  imageUrls: string[];
  groupSkus: string[];
  isMain: boolean;
  size: string;
  color: string;
  material: string;
  collection: string;
  gender: Gender;
  genderFallback?: Fallback;
  productUrl: string | null;
  care: string;
  modelInformation: string;
  rawSignature: string;
}

export interface ProductCandidate {
  key: string;
  sheet: string;
  rows: NormalizedVariantRow[];
  score: number;
  product: ImportedProduct;
}

export interface LinkCheck {
  url: string;
  status: "reachable" | "unreachable";
  httpStatus: number | null;
  contentType: string | null;
  error: string | null;
}

export interface Analysis {
  sourceSha256: string;
  sheets: SheetSummary[];
  rows: NormalizedVariantRow[];
  rejectedRows: RejectedRow[];
  duplicateRows: RejectedRow[];
  invalidLinks: InvalidLink[];
  candidates: ProductCandidate[];
  selected: ProductCandidate[];
  unselected: ProductCandidate[];
}

function displayValue(value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if ("text" in value && typeof value.text === "string") return value.text;
  if ("richText" in value) {
    return value.richText.map((part) => part.text).join("");
  }
  if ("result" in value) return displayValue(value.result ?? null);
  if ("error" in value) return value.error;
  return JSON.stringify(value);
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function normalizeDescription(value: string): string {
  const normalized = normalizeWhitespace(value);
  return normalized
    .replace(/^"{1,3}/, "")
    .replace(/"{1,3}$/, "")
    .trim();
}

function normalizeHeader(value: string): string {
  // The export marks required columns with a trailing asterisk ("Цена товара
  // *"); the alias lookup below is exact, so the marker has to come off first.
  return normalizeWhitespace(value)
    .replace(/\s*\*+$/, "")
    .toLocaleLowerCase("ru-RU");
}

function normalizeSourceValue(value: string): string {
  const normalized = normalizeWhitespace(value);
  return /^(nan|null|none|n\/a)(?:\s*\(|$)/i.test(normalized) ? "" : normalized;
}

function getValue(row: RawWorkbookRow, aliases: readonly string[]): string {
  for (const alias of aliases) {
    const index = row.headers.findIndex(
      (header) => normalizeHeader(header) === alias,
    );
    const value =
      index >= 0 ? normalizeSourceValue(row.values[index] ?? "") : "";
    if (value) return value;
  }
  return "";
}

function parseMoney(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

function splitList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,;\n]/)
        .map(normalizeWhitespace)
        .filter(Boolean),
    ),
  ];
}

function parseImageUrls(
  value: string,
  row: RawWorkbookRow,
  invalidLinks: InvalidLink[],
): string[] {
  return splitList(value).filter((candidate) => {
    try {
      const url = new URL(candidate);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error(`Unsupported protocol ${url.protocol}`);
      }
      return true;
    } catch (error: unknown) {
      invalidLinks.push({
        sheet: row.sheet,
        row: row.rowNumber,
        value: candidate,
        reason: error instanceof Error ? error.message : "Invalid URL",
      });
      return false;
    }
  });
}

function parseProductUrl(value: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function sheetNumericId(sheet: string): number | null {
  const match = /^(\d+)/.exec(sheet);
  return match ? Number(match[1]) : null;
}

function inferGender(
  explicitGender: string,
  name: string,
  sheet: string,
): { gender: Gender; fallback?: Fallback } {
  const direct = `${explicitGender} ${name}`.toLocaleLowerCase("ru-RU");
  if (/unisex|унисекс/.test(direct)) return { gender: "unisex" };
  if (/женск|жен\.|для женщин/.test(direct)) return { gender: "women" };
  if (/мужск|муж\.|для мужчин/.test(direct)) return { gender: "men" };

  if (/unisex|унисекс/i.test(sheet))
    return { gender: "unisex", fallback: "gender-inferred-from-sheet-group" };
  if (/женск|\(ж\)/i.test(sheet))
    return { gender: "women", fallback: "gender-inferred-from-sheet-group" };
  if (/мужск/i.test(sheet))
    return { gender: "men", fallback: "gender-inferred-from-sheet-group" };

  const id = sheetNumericId(sheet);
  if (id !== null && id >= 3437 && id <= 3462) {
    return { gender: "men", fallback: "gender-inferred-from-sheet-group" };
  }
  if (id !== null && id >= 3476 && id <= 3511) {
    return { gender: "women", fallback: "gender-inferred-from-sheet-group" };
  }
  return { gender: "unknown", fallback: "gender-unknown" };
}

function productTypeFromSheet(sheet: string, name: string): string {
  // Broad marketplace sheets are not garment types. Classify only from the
  // source name; keep the original sheet in provenance for review.
  const types: [RegExp, string][] = [
    [/костюм|комплект|двойка|майка.*\/\s*шорты/i, "Комплекты"],
    [/куртк|лайтдаун|пуховик|ветровк/i, "Куртки и пуховики"],
    [/тренч/i, "Тренчи"],
    [/жилет/i, "Жилеты"],
    [/рубашк/i, "Рубашки"],
    [/брюк/i, "Брюки"],
    [/шорт/i, "Шорты"],
    [/футболк/i, "Футболки"],
    [/майк|топ/i, "Майки и топы"],
    [/лонгслив|рашгард/i, "Лонгсливы и рашгарды"],
    [/болеро/i, "Болеро"],
    [/лосин|леггинс/i, "Лосины"],
    [/юбк/i, "Юбки"],
    [/худи|свитшот|толстовк|спортивный зип/i, "Толстовки и свитшоты"],
    [/кепк|шапк/i, "Головные уборы"],
    [/шарф|платок/i, "Шарфы и платки"],
  ];
  for (const [pattern, type] of types) if (pattern.test(name)) return type;
  return sheet.replace(/^\d+\s*/, "").trim();
}

function isAccessoryType(productType: string): boolean {
  return /головн|шарф|платк|аксессуар/i.test(productType);
}

function categoryIdFor(
  gender: Gender,
  productType: string,
): ImportedProduct["categoryId"] {
  if (isAccessoryType(productType)) return "category-accessories";
  if (gender === "men") return "category-men";
  if (gender === "women") return "category-women";
  if (gender === "unisex") return "category-unisex";
  return "category-accessories";
}

function slugFromSku(sku: string): string {
  const normalized = sku
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  // Cyrillic SKU prefixes must not disappear into the same ID as another
  // prefix. Preserve ASCII IDs; give non-ASCII SKUs a deterministic hash.
  const suffix = /[^\x00-\x7f]/.test(sku)
    ? `-${createHash("sha256").update(sku).digest("hex").slice(0, 12)}`
    : "";
  return `toolor-${normalized || "sku"}${suffix}`;
}

function mostFrequent(values: string[]): string {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return (
    [...counts.entries()].sort(
      ([leftValue, leftCount], [rightValue, rightCount]) =>
        rightCount - leftCount || leftValue.localeCompare(rightValue, "ru"),
    )[0]?.[0] ?? ""
  );
}

function normalizedProductName(row: NormalizedVariantRow): string {
  const details = [row.color, row.size].filter(Boolean).join(", ");
  if (details) {
    const escaped = details
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/, /g, ",\\s*");
    const withoutVariant = row.name.replace(
      new RegExp(`\\s*\\(${escaped}\\)\\s*$`, "i"),
      "",
    );
    if (withoutVariant !== row.name) return withoutVariant;
  }
  return row.name.replace(/\s*\(([^()]*)\)\s*$/, (match, detail: string) => {
    const normalizedDetail = detail.toLocaleLowerCase("ru-RU");
    const carriesVariantData =
      (row.size &&
        normalizedDetail.includes(row.size.toLocaleLowerCase("ru-RU"))) ||
      (row.color &&
        normalizedDetail.includes(row.color.toLocaleLowerCase("ru-RU"))) ||
      /(?:^|[\s,/])(xs|s|m|l|xl|xxl|\d?xl|\d{2,3})(?:$|[\s,/])/i.test(detail);
    return carriesVariantData ? "" : match;
  });
}

export function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

async function readWorkbookRows(bytes: Buffer): Promise<{
  sourceSha256: string;
  sheets: SheetSummary[];
  rawRows: RawWorkbookRow[];
}> {
  const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
  const workbook = new ExcelJS.Workbook();
  // ExcelJS's Buffer declaration targets a newer Node type than this repo's
  // pinned @types/node. Runtime accepts the same Uint8Array-backed Buffer.
  await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheets: SheetSummary[] = [];
  const rawRows: RawWorkbookRow[] = [];

  for (const sheet of workbook.worksheets) {
    if (sheets.length >= 100) throw new Error("Too many worksheets");
    if (sheet.rowCount > 10_000) throw new Error("Too many worksheet rows");
    const sheetName = sheet.name;
    const isMetadata = sheetName === "metadata";
    let headers: string[] = [];
    let rowCount = 0;

    for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      rowCount = Math.max(rowCount, row.number);
      if (isMetadata) continue;

      const values: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        if (columnNumber > 100) throw new Error("Too many columns");
        values[columnNumber - 1] = displayValue(cell.value);
      });
      // Trim trailing blanks. The length guard matters: on an all-blank row
      // `at(-1)` returns undefined once the array empties, which `?? ""`
      // turned back into a match — popping an empty array forever.
      while (values.length > 0 && values.at(-1) === "") values.pop();
      if (!values.some((value) => normalizeWhitespace(value))) continue;

      if (headers.length === 0) {
        headers = values.map(normalizeWhitespace);
        continue;
      }

      rawRows.push({
        sheet: sheetName,
        rowNumber: row.number,
        headers,
        values,
      });
      if (rawRows.length > 5_000) throw new Error("Too many catalog rows");
    }

    sheets.push({
      name: sheetName,
      state: isMetadata ? "veryHidden" : "visible",
      rowCount,
      headers,
    });
  }

  return { sourceSha256, sheets, rawRows };
}

export function normalizeRows(rawRows: RawWorkbookRow[]): {
  rows: NormalizedVariantRow[];
  rejectedRows: RejectedRow[];
  duplicateRows: RejectedRow[];
  invalidLinks: InvalidLink[];
} {
  const rows: NormalizedVariantRow[] = [];
  const rejectedRows: RejectedRow[] = [];
  const duplicateRows: RejectedRow[] = [];
  const invalidLinks: InvalidLink[] = [];
  const seenSkus = new Map<string, { sheet: string; row: number }>();
  const seenSignatures = new Set<string>();

  for (const rawRow of rawRows) {
    const sku = getValue(rawRow, BASE_HEADERS.sku);
    const name = getValue(rawRow, BASE_HEADERS.name);
    const sourcePrice = getValue(rawRow, BASE_HEADERS.price);
    const priceAmount = parseMoney(sourcePrice);

    if (!sku || !name || (sourcePrice && priceAmount === null)) {
      rejectedRows.push({
        sheet: rawRow.sheet,
        row: rawRow.rowNumber,
        sku,
        reason: [
          !sku ? "missing SKU" : "",
          !name ? "missing name" : "",
          priceAmount === null ? "missing/invalid price" : "",
        ]
          .filter(Boolean)
          .join(", "),
      });
      continue;
    }

    const rawSignature = createHash("sha1")
      .update(`${rawRow.sheet}\u0000${rawRow.values.join("\u0000")}`)
      .digest("hex");
    if (seenSignatures.has(rawSignature)) {
      duplicateRows.push({
        sheet: rawRow.sheet,
        row: rawRow.rowNumber,
        sku,
        reason: "exact duplicate row",
      });
      continue;
    }
    seenSignatures.add(rawSignature);

    const normalizedSku = sku.toLocaleUpperCase("en-US");
    const duplicateSku = seenSkus.get(normalizedSku);
    if (duplicateSku) {
      duplicateRows.push({
        sheet: rawRow.sheet,
        row: rawRow.rowNumber,
        sku,
        reason: `duplicate SKU; first seen at ${duplicateSku.sheet}!${duplicateSku.row}`,
      });
      continue;
    }
    seenSkus.set(normalizedSku, { sheet: rawRow.sheet, row: rawRow.rowNumber });

    const genderResult = inferGender(
      getValue(rawRow, BASE_HEADERS.gender),
      name,
      rawRow.sheet,
    );
    const modelHeight = getValue(rawRow, BASE_HEADERS.modelHeight);
    const modelSize = getValue(rawRow, BASE_HEADERS.modelSize);

    rows.push({
      sheet: rawRow.sheet,
      rowNumber: rawRow.rowNumber,
      sku,
      name: normalizeWhitespace(name),
      description: normalizeDescription(
        getValue(rawRow, BASE_HEADERS.description),
      ),
      priceAmount: priceAmount ?? 0,
      priceStatus: priceAmount === null ? "unknown" : "known",
      discountAmount:
        parseMoney(getValue(rawRow, BASE_HEADERS.discount)) ?? undefined,
      imageUrls: parseImageUrls(
        getValue(rawRow, BASE_HEADERS.images),
        rawRow,
        invalidLinks,
      ),
      groupSkus: splitList(getValue(rawRow, BASE_HEADERS.group)),
      isMain: /^(да|yes|true|1)$/i.test(getValue(rawRow, BASE_HEADERS.main)),
      size: getValue(rawRow, BASE_HEADERS.size),
      color: getValue(rawRow, BASE_HEADERS.color),
      material: getValue(rawRow, BASE_HEADERS.material),
      collection: getValue(rawRow, BASE_HEADERS.collection),
      gender: genderResult.gender,
      genderFallback: genderResult.fallback,
      productUrl: parseProductUrl(getValue(rawRow, BASE_HEADERS.productUrl)),
      care: getValue(rawRow, BASE_HEADERS.care),
      modelInformation: [
        modelHeight ? `Рост модели: ${modelHeight}` : "",
        modelSize ? `Размер на модели: ${modelSize}` : "",
      ]
        .filter(Boolean)
        .join("; "),
      rawSignature,
    });
  }

  return { rows, rejectedRows, duplicateRows, invalidLinks };
}

/**
 * Variant rows of one product share a SKU stem — `TW-193-1` … `TW-193-12` all
 * belong to `TW-193`. Combined sets carry a compound SKU whose every part is
 * numbered (`TM-0358-1/TM-0349-1`), so the trailing index comes off each part;
 * stripping only the last one left every size as its own product.
 */
function skuStemKey(row: NormalizedVariantRow): string {
  const stem = row.sku
    .split(/[/\\]/)
    .map((part) => part.trim().replace(/-\d+$/, ""))
    .join("/");
  return `${stem}\u0000${normalizedProductName(row).toLocaleLowerCase("ru-RU")}`;
}

function groupKey(row: NormalizedVariantRow): string {
  // The marketplace export only fills the grouping column on some workbooks;
  // when it is blank every row would otherwise become its own product.
  const groupedSkus = row.groupSkus.length
    ? [...row.groupSkus].sort().join("|")
    : skuStemKey(row);
  return `${row.sheet}\u0000${groupedSkus}`;
}

export function buildCandidates(
  rows: NormalizedVariantRow[],
): ProductCandidate[] {
  const groups = new Map<string, NormalizedVariantRow[]>();
  for (const row of rows) {
    const key = groupKey(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return [...groups.entries()].map(([key, groupRows]) => {
    const primary = groupRows.find((row) => row.isMain) ?? groupRows[0];
    if (!primary) throw new Error(`Empty product group: ${key}`);

    const canonicalSku = primary.sku;
    const productType = productTypeFromSheet(primary.sheet, primary.name);
    const name =
      mostFrequent(groupRows.map(normalizedProductName)) || primary.name;
    const description =
      groupRows
        .map((row) => row.description)
        .sort((left, right) => right.length - left.length)[0] ?? "";
    const imageUrls = unique(groupRows.flatMap((row) => row.imageUrls));
    const colors = unique(groupRows.map((row) => row.color));
    const sizes = unique(groupRows.map((row) => row.size));
    const material = mostFrequent(groupRows.map((row) => row.material));
    const collection = mostFrequent(groupRows.map((row) => row.collection));
    const care = mostFrequent(groupRows.map((row) => row.care));
    const modelInformation = mostFrequent(
      groupRows.map((row) => row.modelInformation),
    );
    const gender = mostFrequent(groupRows.map((row) => row.gender)) as Gender;
    const productUrl =
      groupRows.find((row) => row.productUrl)?.productUrl ?? null;
    const fallbacks = new Set<Fallback>(["availability-unknown"]);
    if (groupRows.some((row) => row.priceStatus === "unknown"))
      fallbacks.add("price-missing");

    for (const fallback of groupRows.map((row) => row.genderFallback)) {
      if (fallback) fallbacks.add(fallback);
    }
    if (!description) fallbacks.add("description-missing");
    if (imageUrls.length === 0) fallbacks.add("images-missing");
    if (sizes.length === 0) fallbacks.add("size-missing");
    if (colors.length === 0) fallbacks.add("color-missing");

    const knownPrices = groupRows
      .filter((row) => row.priceStatus === "known")
      .map((row) => row.priceAmount);
    const priceAmount = knownPrices.length ? Math.min(...knownPrices) : 0;
    const discountAmounts = groupRows
      .map((row) => row.discountAmount)
      .filter((amount): amount is number => amount !== undefined);

    let score = 4;
    if (description) score += 1;
    if (imageUrls.length >= 1) score += 1;
    if (imageUrls.length >= 3) score += 1;
    if (groupRows.length >= 2) score += 1;
    if (sizes.length > 0) score += 1;
    if (colors.length > 0) score += 1;
    if (material) score += 1;
    if (groupRows.some((row) => row.isMain)) score += 1;
    if (collection) score += 1;
    if (productUrl) score += 1;

    const product: ImportedProduct = {
      priceStatus: knownPrices.length ? "known" : "unknown",
      id: slugFromSku(canonicalSku).replace(/^toolor-/, "product-"),
      name,
      slug: slugFromSku(canonicalSku),
      description,
      categoryId: categoryIdFor(gender, productType),
      productType,
      gender,
      collectionIds: [],
      ...(collection ? { collectionName: collection } : {}),
      images: imageUrls.map((url, index) => ({
        id: `${canonicalSku}-image-${index + 1}`,
        url,
        alt: `${name}, изображение ${index + 1}`,
        status: "unchecked" as const,
        httpStatus: null,
      })),
      variants: groupRows
        .sort((left, right) => left.sku.localeCompare(right.sku, "en"))
        .map((row) => {
          const options = Object.fromEntries(
            [
              row.size ? ["size", row.size] : null,
              row.color ? ["color", row.color] : null,
            ].filter((entry): entry is [string, string] => entry !== null),
          );
          return {
            priceStatus: row.priceStatus,
            id: slugFromSku(row.sku).replace(/^toolor-/, "variant-"),
            title:
              [row.color, row.size].filter(Boolean).join(" / ") ||
              `[Fallback] Вариант ${row.sku}`,
            sku: row.sku,
            availableForSale: false as const,
            availabilityStatus: "unknown" as const,
            options,
            price: { amount: row.priceAmount, currencyCode: "KGS" as const },
            ...(row.discountAmount !== undefined
              ? {
                  discountAmount: {
                    amount: row.discountAmount,
                    currencyCode: "KGS" as const,
                  },
                }
              : {}),
          };
        }),
      price: { amount: priceAmount, currencyCode: "KGS" },
      ...(discountAmounts.length
        ? {
            discountAmount: {
              amount: Math.min(...discountAmounts),
              currencyCode: "KGS" as const,
            },
          }
        : {}),
      featured: false,
      tags: unique([productType, collection, ...colors]),
      colors,
      sizes,
      ...(material ? { material } : {}),
      ...(care ? { care } : {}),
      ...(modelInformation ? { modelInformation } : {}),
      dataSource: "spreadsheet",
      fallbacks: [...fallbacks],
      source: {
        workbook: SOURCE_LABEL,
        sheet: primary.sheet,
        rows: groupRows.map((row) => row.rowNumber).sort((a, b) => a - b),
        originalSkus: groupRows.map((row) => row.sku),
        productUrl,
      },
    };

    return { key, sheet: primary.sheet, rows: groupRows, score, product };
  });
}

export function selectCandidates(candidates: ProductCandidate[]): {
  selected: ProductCandidate[];
  unselected: ProductCandidate[];
} {
  const eligible = candidates.sort(
    (left, right) =>
      right.score - left.score ||
      right.product.images.length - left.product.images.length ||
      right.product.variants.length - left.product.variants.length ||
      left.sheet.localeCompare(right.sheet, "ru") ||
      left.product.name.localeCompare(right.product.name, "ru"),
  );

  // Every valid group ships, even when optional fields are missing. Nothing is dropped for sharing a
  // name: the workbook's own grouping column splits a garment by colourway, so
  // same-name groups are separate colours of one model, and de-duplicating
  // them threw away every colour but the first.
  const selected = [...eligible];

  if (selected.length === 0) {
    throw new Error("No valid product groups were found.");
  }

  const selectedKeys = new Set(selected.map((candidate) => candidate.key));
  return {
    selected,
    unselected: candidates.filter(
      (candidate) => !selectedKeys.has(candidate.key),
    ),
  };
}
export async function analyzeWorkbook(bytes: Buffer): Promise<Analysis> {
  const { sourceSha256, sheets, rawRows } = await readWorkbookRows(bytes);
  const normalized = normalizeRows(rawRows);
  const candidates = buildCandidates(normalized.rows);
  const { selected, unselected } = selectCandidates(candidates);

  return {
    sourceSha256,
    sheets,
    ...normalized,
    candidates,
    selected,
    unselected,
  };
}

/** The admin uses the same normalization as the offline importer, but never
 * writes into the deployed checkout or exposes supplier image URLs. */
export async function inspectUploadedWorkbook(bytes: Buffer, filename: string) {
  const analysis = await analyzeWorkbook(bytes);
  if (
    analysis.rejectedRows.length ||
    analysis.duplicateRows.length ||
    analysis.invalidLinks.length
  ) {
    throw new Error(
      `Таблица требует исправления: отклонено строк ${analysis.rejectedRows.length}, повторов SKU ${analysis.duplicateRows.length}, неверных ссылок ${analysis.invalidLinks.length}.`,
    );
  }
  const products = analysis.selected.map((candidate, index) => ({
    ...candidate.product,
    featured: index < 6,
    source: { ...candidate.product.source, workbook: filename },
  }));
  for (const values of [
    products.map((item) => item.id),
    products.map((item) => item.slug),
    products.flatMap((item) => item.variants.map((variant) => variant.id)),
  ]) {
    if (new Set(values).size !== values.length)
      throw new Error("В таблице совпадают идентификаторы товаров или вариантов.");
  }
  return {
    source: {
      workbook: filename,
      sha256: analysis.sourceSha256,
      generatedAt: new Date().toISOString(),
      worksheetCount: analysis.sheets.length,
      productWorksheetCount: analysis.sheets.filter((sheet) => sheet.name !== "metadata").length,
    },
    products,
    variantCount: analysis.rows.length,
    imageUrls: [...new Set(products.flatMap((product) => product.images.map((image) => image.url)))],
  };
}
