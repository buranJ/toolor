import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import ExcelJS, { type CellValue } from "exceljs";

import {
  generatedProductFileSchema,
  type GeneratedProductFile,
  type ImportedProduct,
} from "../src/lib/commerce/importers/toolor-product-schema";

const SOURCE_PATH = resolve(process.cwd(), "docs/data-toolor.xlsx");
const GENERATED_JSON_PATH = resolve(
  process.cwd(),
  "src/data/toolor-products.generated.json",
);
const REPORT_PATH = resolve(process.cwd(), "docs/PRODUCT_IMPORT_REPORT.md");
const SOURCE_LABEL = "docs/data-toolor.xlsx" as const;
const TARGET_PRODUCT_COUNT = 24;

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
  color: ["цвет"],
  material: [
    "состав",
    "состав материала",
    "материал",
    "материал верха",
    "тип ткани",
  ],
  collection: ["коллекция"],
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

interface ProductCandidate {
  key: string;
  sheet: string;
  rows: NormalizedVariantRow[];
  score: number;
  product: ImportedProduct;
}

interface LinkCheck {
  url: string;
  status: "reachable" | "unreachable";
  httpStatus: number | null;
  contentType: string | null;
  error: string | null;
}

interface Analysis {
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
  return normalizeWhitespace(value).toLocaleLowerCase("ru-RU");
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
  if (/женск|жен\.|для женщин/.test(direct)) return { gender: "women" };
  if (/мужск|муж\.|для мужчин/.test(direct)) return { gender: "men" };

  const id = sheetNumericId(sheet);
  if (id !== null && id >= 3437 && id <= 3462) {
    return { gender: "men", fallback: "gender-inferred-from-sheet-group" };
  }
  if (id !== null && id >= 3476 && id <= 3511) {
    return { gender: "women", fallback: "gender-inferred-from-sheet-group" };
  }
  return { gender: "unknown", fallback: "gender-unknown" };
}

function productTypeFromSheet(sheet: string): string {
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
  return "category-accessories";
}

function slugFromSku(sku: string): string {
  const normalized = sku
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `toolor-${normalized || createHash("sha1").update(sku).digest("hex").slice(0, 10)}`;
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

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

async function readWorkbookRows(): Promise<{
  sourceSha256: string;
  sheets: SheetSummary[];
  rawRows: RawWorkbookRow[];
}> {
  const bytes = await readFile(SOURCE_PATH);
  const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
  const workbook = new ExcelJS.stream.xlsx.WorkbookReader(SOURCE_PATH, {
    worksheets: "emit",
    sharedStrings: "cache",
    hyperlinks: "cache",
    styles: "ignore",
  });
  const sheets: SheetSummary[] = [];
  const rawRows: RawWorkbookRow[] = [];

  for await (const sheet of workbook) {
    // ExcelJS exposes worksheet names at runtime but omits them from WorksheetReader types.
    const sheetNameValue = (sheet as unknown as { name?: unknown }).name;
    if (typeof sheetNameValue !== "string") {
      throw new Error("Worksheet reader did not expose a sheet name.");
    }
    const sheetName = sheetNameValue;
    const isMetadata = sheetName === "metadata";
    let headers: string[] = [];
    let rowCount = 0;

    for await (const row of sheet) {
      rowCount = Math.max(rowCount, row.number);
      if (isMetadata) continue;

      const values: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        values[columnNumber - 1] = displayValue(cell.value);
      });
      while ((values.at(-1) ?? "") === "") values.pop();
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

function normalizeRows(rawRows: RawWorkbookRow[]): {
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
    const priceAmount = parseMoney(getValue(rawRow, BASE_HEADERS.price));

    if (!sku || !name || priceAmount === null) {
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
      priceAmount,
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

function groupKey(row: NormalizedVariantRow): string {
  const groupedSkus = row.groupSkus.length
    ? [...row.groupSkus].sort().join("|")
    : row.sku;
  return `${row.sheet}\u0000${groupedSkus}`;
}

function buildCandidates(rows: NormalizedVariantRow[]): ProductCandidate[] {
  const groups = new Map<string, NormalizedVariantRow[]>();
  for (const row of rows) {
    const key = groupKey(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return [...groups.entries()].map(([key, groupRows]) => {
    const primary = groupRows.find((row) => row.isMain) ?? groupRows[0];
    if (!primary) throw new Error(`Empty product group: ${key}`);

    const canonicalSku = primary.sku;
    const productType = productTypeFromSheet(primary.sheet);
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

    for (const fallback of groupRows.map((row) => row.genderFallback)) {
      if (fallback) fallbacks.add(fallback);
    }
    if (!description) fallbacks.add("description-missing");
    if (imageUrls.length === 0) fallbacks.add("images-missing");
    if (sizes.length === 0) fallbacks.add("size-missing");
    if (colors.length === 0) fallbacks.add("color-missing");

    const priceAmount = Math.min(...groupRows.map((row) => row.priceAmount));
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
      id: `product-${canonicalSku.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-")}`,
      name,
      slug: slugFromSku(canonicalSku),
      description:
        description || "[Fallback] Описание отсутствует в исходном workbook.",
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
            id: `variant-${row.sku.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-")}`,
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

function selectCandidates(candidates: ProductCandidate[]): {
  selected: ProductCandidate[];
  unselected: ProductCandidate[];
} {
  const eligible = candidates
    .filter((candidate) => candidate.score >= 7)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.product.images.length - left.product.images.length ||
        right.product.variants.length - left.product.variants.length ||
        left.sheet.localeCompare(right.sheet, "ru") ||
        left.product.name.localeCompare(right.product.name, "ru"),
    );

  const selected: ProductCandidate[] = [];
  const usedSheets = new Set<string>();
  const usedNames = new Set<string>();
  const identity = (candidate: ProductCandidate) =>
    candidate.product.name.toLocaleLowerCase("ru-RU");
  const add = (candidate: ProductCandidate) => {
    selected.push(candidate);
    usedSheets.add(candidate.sheet);
    usedNames.add(identity(candidate));
  };

  const accessoryCandidates = eligible.filter((candidate) =>
    isAccessoryType(candidate.product.productType),
  );
  for (const candidate of accessoryCandidates) {
    if (usedSheets.has(candidate.sheet) || usedNames.has(identity(candidate)))
      continue;
    add(candidate);
  }

  for (const candidate of eligible) {
    if (selected.length >= TARGET_PRODUCT_COUNT) break;
    if (usedSheets.has(candidate.sheet) || usedNames.has(identity(candidate)))
      continue;
    add(candidate);
  }

  for (const candidate of eligible) {
    if (selected.length >= TARGET_PRODUCT_COUNT) break;
    if (selected.includes(candidate)) continue;
    if (usedNames.has(identity(candidate))) continue;
    const sameSheetCount = selected.filter(
      (item) => item.sheet === candidate.sheet,
    ).length;
    if (sameSheetCount < 2) add(candidate);
  }

  if (selected.length < 20) {
    throw new Error(
      `Only ${selected.length} sufficiently complete product groups were found.`,
    );
  }

  const selectedKeys = new Set(selected.map((candidate) => candidate.key));
  return {
    selected,
    unselected: candidates.filter(
      (candidate) => !selectedKeys.has(candidate.key),
    ),
  };
}

async function analyzeWorkbook(): Promise<Analysis> {
  const { sourceSha256, sheets, rawRows } = await readWorkbookRows();
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

async function fetchImage(
  url: string,
  method: "HEAD" | "GET",
): Promise<Response> {
  return fetch(url, {
    method,
    redirect: "follow",
    signal: AbortSignal.timeout(8_000),
    headers: {
      "user-agent": "ToolorProductImporter/1.0",
      ...(method === "GET" ? { range: "bytes=0-1023" } : {}),
    },
  });
}

async function checkImageUrl(url: string): Promise<LinkCheck> {
  try {
    let response = await fetchImage(url, "HEAD");
    let contentType = response.headers.get("content-type");

    if (
      !response.ok ||
      !contentType?.toLocaleLowerCase().startsWith("image/")
    ) {
      response = await fetchImage(url, "GET");
      contentType = response.headers.get("content-type");
      await response.body?.cancel();
    }

    const reachable =
      response.ok &&
      Boolean(contentType?.toLocaleLowerCase().startsWith("image/"));
    return {
      url,
      status: reachable ? "reachable" : "unreachable",
      httpStatus: response.status,
      contentType,
      error: reachable ? null : `Unexpected status/content-type`,
    };
  } catch (error: unknown) {
    return {
      url,
      status: "unreachable",
      httpStatus: null,
      contentType: null,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

async function checkSelectedImages(
  selected: ProductCandidate[],
): Promise<Map<string, LinkCheck>> {
  const urls = unique(
    selected.flatMap((candidate) =>
      candidate.product.images.map((image) => image.url),
    ),
  );
  const results = new Map<string, LinkCheck>();
  let cursor = 0;

  await Promise.all(
    Array.from({ length: Math.min(10, urls.length) }, async () => {
      while (cursor < urls.length) {
        const url = urls[cursor];
        cursor += 1;
        if (!url) continue;
        results.set(url, await checkImageUrl(url));
      }
    }),
  );

  return results;
}

function withLinkChecks(
  selected: ProductCandidate[],
  linkChecks: Map<string, LinkCheck>,
): ImportedProduct[] {
  return selected.map((candidate, index) => ({
    ...candidate.product,
    featured: index < 6,
    images: candidate.product.images.map((image) => {
      const check = linkChecks.get(image.url);
      return {
        ...image,
        status: check?.status ?? "unchecked",
        httpStatus: check?.httpStatus ?? null,
      };
    }),
  }));
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-KG", {
    style: "currency",
    currency: "KGS",
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function rowsLabel(rows: number[]): string {
  return rows.join(", ");
}

function buildReport(
  analysis: Analysis,
  products: ImportedProduct[],
  linkChecks: Map<string, LinkCheck>,
  generatedAt: string,
): string {
  const productSheets = analysis.sheets.filter(
    (sheet) => sheet.name !== "metadata",
  );
  const allImageUrls = unique(analysis.rows.flatMap((row) => row.imageUrls));
  const selectedImageUrls = unique(
    products.flatMap((product) => product.images.map((image) => image.url)),
  );
  const reachable = [...linkChecks.values()].filter(
    (check) => check.status === "reachable",
  );
  const unreachable = [...linkChecks.values()].filter(
    (check) => check.status === "unreachable",
  );
  const prices = analysis.rows.map((row) => row.priceAmount);
  const selectedPrices = products.map((product) => product.price.amount);
  const missing = {
    description: analysis.rows.filter((row) => !row.description).length,
    images: analysis.rows.filter((row) => row.imageUrls.length === 0).length,
    size: analysis.rows.filter((row) => !row.size).length,
    color: analysis.rows.filter((row) => !row.color).length,
    material: analysis.rows.filter((row) => !row.material).length,
    productUrl: analysis.rows.filter((row) => !row.productUrl).length,
  };
  const hosts = [
    ...new Set(selectedImageUrls.map((url) => new URL(url).hostname)),
  ].sort();
  const categories = [
    ...new Set(products.map((product) => product.productType)),
  ].sort((a, b) => a.localeCompare(b, "ru"));
  const colors = unique(products.flatMap((product) => product.colors)).sort(
    (a, b) => a.localeCompare(b, "ru"),
  );
  const sizes = unique(products.flatMap((product) => product.sizes)).sort(
    (a, b) => a.localeCompare(b, "ru"),
  );
  const namesByIdentity = new Map<string, ProductCandidate[]>();
  for (const candidate of analysis.candidates) {
    const identity = candidate.product.name.toLocaleLowerCase("ru-RU");
    namesByIdentity.set(identity, [
      ...(namesByIdentity.get(identity) ?? []),
      candidate,
    ]);
  }
  const repeatedNames = [...namesByIdentity.values()].filter(
    (items) => items.length > 1,
  );
  const repeatedNamesTable = repeatedNames
    .map(
      (items) =>
        `| ${markdownCell(items[0]?.product.name ?? "—")} | ${items.length} | ${markdownCell(unique(items.map((item) => item.sheet)).join(", "))} |`,
    )
    .join("\n");

  const sheetTable = productSheets
    .map(
      (sheet) =>
        `| ${markdownCell(sheet.name)} | ${Math.max(0, sheet.rowCount - 1)} | ${sheet.headers.length} | ${markdownCell(sheet.headers.join("; "))} |`,
    )
    .join("\n");
  const invalidRowsTable = [...analysis.rejectedRows, ...analysis.duplicateRows]
    .map(
      (row) =>
        `| ${markdownCell(row.sheet)} | ${row.row} | ${markdownCell(row.sku || "—")} | ${markdownCell(row.reason)} |`,
    )
    .join("\n");
  const unselectedTable = analysis.unselected
    .sort(
      (left, right) =>
        left.sheet.localeCompare(right.sheet, "ru") ||
        left.product.name.localeCompare(right.product.name, "ru"),
    )
    .map(
      (candidate) =>
        `| ${markdownCell(candidate.sheet)} | ${rowsLabel(candidate.product.source.rows)} | ${markdownCell(candidate.product.name)} | ${candidate.score} | not selected: 24-product completeness/diversity limit |`,
    )
    .join("\n");
  const linkTable = [...linkChecks.values()]
    .sort(
      (left, right) =>
        left.status.localeCompare(right.status) ||
        left.url.localeCompare(right.url),
    )
    .map(
      (check) =>
        `| ${check.status} | ${check.httpStatus ?? "—"} | ${markdownCell(check.contentType ?? "—")} | ${markdownCell(check.url)} | ${markdownCell(check.error ?? "—")} |`,
    )
    .join("\n");

  return `# Product import report

Generated: ${generatedAt}

## Source integrity

- Workbook: \`${SOURCE_LABEL}\`
- SHA-256: \`${analysis.sourceSha256}\`
- Workbook was read in streaming/read-only mode and was not rewritten.
- Sheets: ${analysis.sheets.length} total; ${productSheets.length} visible product sheets; 1 very-hidden \`metadata\` sheet.
- Embedded workbook images: 0. Product imagery is supplied as external URLs in cells.
- Product page URL columns found: none. No product pages were scraped.

## Workbook structure

| Sheet | Data rows | Columns | Headers |
|---|---:|---:|---|
${sheetTable}

## Data quality summary

- Raw data rows: ${analysis.rows.length + analysis.rejectedRows.length + analysis.duplicateRows.length}.
- Valid unique SKU rows: ${analysis.rows.length}.
- Product groups after variant normalization: ${analysis.candidates.length}.
- Imported product groups: ${products.length} (${products.reduce((sum, product) => sum + product.variants.length, 0)} variants).
- Rejected required-field rows: ${analysis.rejectedRows.length}.
- Duplicate rows/SKUs removed: ${analysis.duplicateRows.length}.
- Repeated normalized product names across groups: ${repeatedNames.length}; the final selection keeps names unique.
- Syntactically invalid image links: ${analysis.invalidLinks.length}.
- Unique syntactically valid image URLs in workbook: ${allImageUrls.length}.
- Workbook price range: ${formatMoney(Math.min(...prices))}–${formatMoney(Math.max(...prices))}.
- Imported price range: ${formatMoney(Math.min(...selectedPrices))}–${formatMoney(Math.max(...selectedPrices))}.
- Imported product types: ${categories.join(", ")}.
- Imported colors: ${colors.length ? colors.join(", ") : "none supplied"}.
- Imported sizes: ${sizes.length ? sizes.join(", ") : "none supplied"}.

### Missing values across valid SKU rows

| Field | Missing rows | Fallback |
|---|---:|---|
| Description | ${missing.description} | Explicit \`[Fallback] Описание отсутствует…\` only when required |
| Images | ${missing.images} | CSS-controlled image placeholder; no invented URL |
| Size | ${missing.size} | Empty options plus \`size-missing\` marker |
| Color | ${missing.color} | Empty options plus \`color-missing\` marker |
| Material | ${missing.material} | Field omitted |
| Product URL | ${missing.productUrl} | \`null\`; no scraping |
| Inventory/availability | ${analysis.rows.length} | \`availabilityStatus: unknown\`, \`availableForSale: false\` |

### Duplicate-like product names

These are separate source groups with the same normalized name. They are reported as duplicate-like rather than automatically merged because their grouping/SKU data differ.

| Product name | Groups | Source sheets |
|---|---:|---|
${repeatedNamesTable || "| — | 0 | — |"}

## Imported products

One highest-completeness product group was preferred per source sheet; remaining slots were filled by score. A group scores required identifiers/name/price plus description, images, variants, sizes, colors, material, main-row marker, collection and product URL.

| # | Product | Sheet | Source rows | SKUs | Variants | Images | Price | Score |
|---:|---|---|---|---|---:|---:|---:|---:|
${products
  .map((product, index) => {
    const candidate = analysis.selected.find(
      (item) => item.product.id === product.id,
    );
    return `| ${index + 1} | ${markdownCell(product.name)} | ${markdownCell(product.source.sheet)} | ${rowsLabel(product.source.rows)} | ${markdownCell(product.source.originalSkus.join(", "))} | ${product.variants.length} | ${product.images.length} | ${formatMoney(product.price.amount)} | ${candidate?.score ?? "—"} |`;
  })
  .join("\n")}

## Rows not imported

Rows with invalid required fields or duplicates:

| Sheet | Row | SKU | Reason |
|---|---:|---|---|
${invalidRowsTable || "| — | — | — | None |"}

Valid product groups excluded by the 24-product limit:

| Sheet | Rows | Product | Score | Reason |
|---|---|---|---:|---|
${unselectedTable || "| — | — | — | — | None |"}

## Image URL verification

- Checked selected unique image URLs: ${linkChecks.size}.
- Reachable image responses: ${reachable.length}.
- Unreachable or non-image responses: ${unreachable.length}.
- Allowed source hostnames: ${hosts.join(", ")}.
- Verification is a point-in-time network check; availability can change.

| Result | HTTP | Content-Type | URL | Note |
|---|---:|---|---|---|
${linkTable || "| unchecked | — | — | — | No selected image URLs |"}

## Invalid image URL syntax

${
  analysis.invalidLinks.length
    ? analysis.invalidLinks
        .map(
          (link) =>
            `- ${link.sheet}!${link.row}: \`${link.value}\` — ${link.reason}`,
        )
        .join("\n")
    : "No syntactically invalid image URLs were found."
}

## Normalization decisions and explicit assumptions

1. Each row is treated as a SKU/variant. The \`Объединить карточки в одну по SKU\` list defines a product group; an absent group list creates a one-variant product.
2. Prices are taken verbatim from \`Цена товара\` and converted from KGS major units to integer minor units. \`Сумма скидки\` is stored as a discount amount but is not used to derive a sale price because its commercial semantics were not supplied.
3. Inventory is absent, so availability is explicitly unknown and \`availableForSale\` is false.
4. Gender first uses an explicit \`Пол\` value or product-name wording. Where absent, numeric sheet groups 3437–3462 → men and 3476–3511 → women are marked with \`gender-inferred-from-sheet-group\`. Headwear/scarves remain accessory products.
5. Missing descriptions, images, sizes and colors use only the explicit fallback markers recorded in each generated product.
6. The first six products are marked \`featured\` by import completeness ordering; this is an editorial UI choice, not a workbook business flag.
7. Image dimensions, alt copy, care details and model facts are not invented. Alt text contains only the source product name and image index.

## Data still needed from the client

- Current inventory and sellability per SKU.
- Canonical product page URLs and redirect rules.
- Confirmed discount/sale-price semantics.
- Approved product taxonomy and gender mapping for sheet IDs.
- Image ownership, intended order/roles, intrinsic dimensions and final alt text.
- Complete color, size, material, care and model information where cells are empty.
- Confirmation that the external image hosts are suitable for production delivery.
`;
}

async function writeOutputs(analysis: Analysis): Promise<void> {
  const linkChecks = await checkSelectedImages(analysis.selected);
  const products = withLinkChecks(analysis.selected, linkChecks);
  const generatedAt = new Date().toISOString();
  const generated: GeneratedProductFile = generatedProductFileSchema.parse({
    source: {
      workbook: SOURCE_LABEL,
      sha256: analysis.sourceSha256,
      generatedAt,
      worksheetCount: analysis.sheets.length,
      productWorksheetCount: analysis.sheets.filter(
        (sheet) => sheet.name !== "metadata",
      ).length,
    },
    products,
  });
  const report = buildReport(analysis, products, linkChecks, generatedAt);

  await writeFile(
    GENERATED_JSON_PATH,
    `${JSON.stringify(generated, null, 2)}\n`,
  );
  await writeFile(REPORT_PATH, report);

  const sourceAfterWrite = createHash("sha256")
    .update(await readFile(SOURCE_PATH))
    .digest("hex");
  if (sourceAfterWrite !== analysis.sourceSha256) {
    throw new Error(
      "Source workbook changed during import; outputs are unsafe.",
    );
  }

  console.log(
    JSON.stringify(
      {
        generatedJson: GENERATED_JSON_PATH,
        report: REPORT_PATH,
        sourceSha256: analysis.sourceSha256,
        sourceUnchanged: true,
        products: products.map((product) => ({
          name: product.name,
          sheet: product.source.sheet,
          rows: product.source.rows,
          variants: product.variants.length,
          images: product.images.length,
        })),
        imageLinks: {
          checked: linkChecks.size,
          reachable: [...linkChecks.values()].filter(
            (check) => check.status === "reachable",
          ).length,
          unreachable: [...linkChecks.values()].filter(
            (check) => check.status === "unreachable",
          ).length,
        },
      },
      null,
      2,
    ),
  );
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  const analysis = await analyzeWorkbook();

  if (mode === "--inspect") {
    console.log(
      JSON.stringify(
        {
          source: SOURCE_LABEL,
          sourceSha256: analysis.sourceSha256,
          sheets: analysis.sheets.map((sheet) => ({
            name: sheet.name,
            state: sheet.state,
            rows: sheet.rowCount,
            columns: sheet.headers.length,
          })),
          validVariantRows: analysis.rows.length,
          rejectedRows: analysis.rejectedRows.length,
          duplicateRows: analysis.duplicateRows.length,
          candidateProductGroups: analysis.candidates.length,
          selectedProducts: analysis.selected.map((candidate) => ({
            name: candidate.product.name,
            sheet: candidate.sheet,
            rows: candidate.product.source.rows,
            score: candidate.score,
            variants: candidate.product.variants.length,
            images: candidate.product.images.length,
            colors: candidate.product.colors,
            sizes: candidate.product.sizes,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  if (mode === "--write") {
    await writeOutputs(analysis);
    return;
  }

  throw new Error("Use --inspect or --write.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
