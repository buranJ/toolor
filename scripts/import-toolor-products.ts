import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  analyzeWorkbook,
  unique,
  type Analysis,
  type ProductCandidate,
  type LinkCheck,
} from "../src/lib/commerce/importers/workbook-parser";
export {
  normalizeRows,
  buildCandidates,
  selectCandidates,
  inspectUploadedWorkbook,
} from "../src/lib/commerce/importers/workbook-parser";
import {
  generatedProductFileSchema,
  type GeneratedProductFile,
  type ImportedProduct,
} from "../src/lib/commerce/importers/toolor-product-schema";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
const SOURCE_PATH = resolve(process.cwd(), argument("--source") ?? "bd/marketplace_catalog.xlsx");
const GENERATED_JSON_PATH = resolve(process.cwd(), argument("--output") ?? "src/data/toolor-products.generated.json");
const REPORT_PATH = resolve(process.cwd(), argument("--report") ?? "docs/PRODUCT_IMPORT_REPORT.md");
const SOURCE_LABEL = basename(SOURCE_PATH);

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
  const reachable = [...linkChecks.values()].filter(
    (check) => check.status === "reachable",
  );
  const unreachable = [...linkChecks.values()].filter(
    (check) => check.status === "unreachable",
  );
  const prices = analysis.rows
    .filter((row) => row.priceStatus === "known")
    .map((row) => row.priceAmount);
  const selectedPrices = products
    .filter((product) => product.priceStatus === "known")
    .map((product) => product.price.amount);
  const missing = {
    price: analysis.rows.filter((row) => row.priceStatus === "unknown").length,
    description: analysis.rows.filter((row) => !row.description).length,
    images: analysis.rows.filter((row) => row.imageUrls.length === 0).length,
    size: analysis.rows.filter((row) => !row.size).length,
    color: analysis.rows.filter((row) => !row.color).length,
    material: analysis.rows.filter((row) => !row.material).length,
    productUrl: analysis.rows.filter((row) => !row.productUrl).length,
  };
  const hosts = [
    ...new Set(allImageUrls.map((url) => new URL(url).hostname)),
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
        `| ${markdownCell(candidate.sheet)} | ${rowsLabel(candidate.product.source.rows)} | ${markdownCell(candidate.product.name)} | ${candidate.score} | not selected: below completeness threshold or duplicate product name |`,
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
        `| ${check.status} | ${check.httpStatus ?? "—"} | ${markdownCell(check.contentType ?? "—")} | ${new URL(check.url).hostname} / ${createHash("sha256").update(check.url).digest("hex").slice(0, 12)} | ${check.error ? "Image unavailable" : "—"} |`,
    )
    .join("\n");

  return `# Product import report

Generated: ${generatedAt}

## Source integrity

- Workbook: \`${SOURCE_LABEL}\`
- SHA-256: \`${analysis.sourceSha256}\`
- Workbook was read in read-only mode and was not rewritten.
- Sheets: ${analysis.sheets.length} total; ${productSheets.length} product sheets.
- Product imagery is read from URL cells. No product pages were scraped.
- Reproduce: \`pnpm products:import --source /path/to/${SOURCE_LABEL} --local-images\`. Keep the workbook private; do not commit supplier signatures.

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
- Repeated normalized product names across groups: ${repeatedNames.length}; all source groups are retained.
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
| Description | ${missing.description} | Empty source field; translated UI fallback and \`description-missing\` marker |
| Price | ${missing.price} | \`priceStatus: unknown\`; zero is an internal sentinel only, never displayed or orderable |
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

Every valid source group is imported, including products missing optional fields. Completeness affects ordering only, not inclusion. Same-name groups are not merged.

| # | Product | Sheet | Source rows | SKUs | Variants | Images | Price | Score |
|---:|---|---|---|---|---:|---:|---:|---:|
${products
  .map((product, index) => {
    const candidate = analysis.selected.find(
      (item) => item.product.id === product.id,
    );
    return `| ${index + 1} | ${markdownCell(product.name)} | ${markdownCell(product.source.sheet)} | ${rowsLabel(product.source.rows)} | ${markdownCell(product.source.originalSkus.join(", "))} | ${product.variants.length} | ${product.images.length} | ${product.priceStatus === "unknown" ? "Unknown (not orderable)" : formatMoney(product.price.amount)} | ${candidate?.score ?? "—"} |`;
  })
  .join("\n")}

## Rows not imported

Rows with invalid required fields or duplicates:

| Sheet | Row | SKU | Reason |
|---|---:|---|---|
${invalidRowsTable || "| — | — | — | None |"}

Valid product groups excluded:

| Sheet | Rows | Product | Score | Reason |
|---|---|---|---:|---|
${unselectedTable || "| — | — | — | — | None |"}

## Image URL verification

- Checked selected unique image URLs: ${linkChecks.size}.
- Reachable image responses: ${reachable.length}.
- Unreachable or non-image responses: ${unreachable.length}.
- Allowed source hostnames: ${hosts.join(", ")}.
- With \`--local-images\`, all image bodies are downloaded and decoded before replacing the catalog. Browser payloads contain local paths only, not supplier signatures. Local WebP copies use quality 92, Lanczos downscaling with a maximum 2400px edge and no upscaling; Next Image serves responsive AVIF/WebP versions.

| Result | HTTP | Content-Type | URL | Note |
|---|---:|---|---|---|
${linkTable || "| unchecked | — | — | — | No selected image URLs |"}

## Invalid image URL syntax

${
  analysis.invalidLinks.length
    ? analysis.invalidLinks
        .map(
          (link) =>
            `- ${link.sheet}!${link.row}: invalid image URL (value withheld)`,
        )
        .join("\n")
    : "No syntactically invalid image URLs were found."
}

## Normalization decisions and explicit assumptions

1. Each row is treated as a SKU/variant. The grouping list defines a product group; when absent, the SKU stem and normalized name define grouping. Source SKU spelling is preserved, including Cyrillic characters; non-ASCII IDs receive a deterministic hash suffix.
2. Prices are taken verbatim from \`Цена товара\` and converted from KGS major units to integer minor units. \`Сумма скидки\` is stored as a discount amount but is not used to derive a sale price because its commercial semantics were not supplied.
3. Store-specific stock columns are not treated as verified current sellability. Availability is unknown and \`availableForSale\` is false; the website accepts requests for specialist confirmation.
4. Gender first uses explicit values or product-name wording, then named men/women/unisex sheets. Inference is marked with \`gender-inferred-from-sheet-group\`. Legacy numeric sheet ranges remain supported. Headwear/scarves are accessories; unisex garments have their own category. Garment types are classified from source names, not broad gender/promotional sheet titles.
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
- Missing photos where the supplied workbook has no image URL. After localization, the storefront does not request supplier images.
`;
}

async function writeOutputs(analysis: Analysis): Promise<void> {
  if (
    analysis.rejectedRows.length ||
    analysis.duplicateRows.length ||
    analysis.invalidLinks.length
  ) {
    throw new Error(
      "Source rows or images need review; refusing a partial catalog replacement. Use --inspect.",
    );
  }
  const urls = unique(
    analysis.selected.flatMap((candidate) =>
      candidate.product.images.map((image) => image.url),
    ),
  );
  // Local assets are mandatory on write: omitting a flag must never publish
  // signed supplier URLs or a catalog dependent on expiring image links.
  const { localizeCatalogImages } = await import("./product-image-assets");
  const assets = await localizeCatalogImages(urls);
  const linkChecks: Map<string, LinkCheck> = new Map(
    [...assets].map(([url]) => [
      url,
      {
        url,
        status: "reachable",
        httpStatus: 200,
        contentType: "image/webp",
        error: null,
      },
    ]),
  );
  const products = withLinkChecks(analysis.selected, linkChecks);
  for (const product of products)
    for (const image of product.images) {
      const asset = assets.get(image.url);
      if (!asset) throw new Error("Missing localized image");
      image.url = asset.path;
    }
  for (const values of [
    products.map((p) => p.id),
    products.map((p) => p.slug),
    products.flatMap((p) => p.variants.map((v) => v.id)),
  ]) {
    if (new Set(values).size !== values.length)
      throw new Error(
        "Product or variant ID collision; catalog was not replaced.",
      );
  }
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

  const sourceAfterWrite = createHash("sha256")
    .update(await readFile(/* turbopackIgnore: true */ SOURCE_PATH))
    .digest("hex");
  if (sourceAfterWrite !== analysis.sourceSha256) {
    throw new Error(
      "Source workbook changed during import; outputs are unsafe.",
    );
  }
  await writeFile(
    GENERATED_JSON_PATH,
    `${JSON.stringify(generated, null, 2)}\n`,
  );
  await writeFile(REPORT_PATH, report);

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
  const analysis = await analyzeWorkbook(await readFile(SOURCE_PATH));

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
          invalidImageLinks: analysis.invalidLinks.map((link) => ({
            sheet: link.sheet,
            row: link.row,
            reason: "Invalid image URL",
          })),
          rejectedDetails: analysis.rejectedRows,
          duplicateDetails: analysis.duplicateRows,
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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
