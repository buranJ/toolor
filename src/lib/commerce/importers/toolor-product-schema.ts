import { z } from "zod";

const moneySchema = z.object({
  amount: z.number().int().nonnegative(),
  currencyCode: z.literal("KGS"),
});

const importedImageSchema = z.object({
  id: z.string().min(1),
  url: z.url(),
  alt: z.string().min(1),
  status: z.enum(["reachable", "unreachable", "unchecked"]),
  httpStatus: z.number().int().nullable(),
});

const importedVariantSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sku: z.string().min(1),
  availableForSale: z.literal(false),
  availabilityStatus: z.literal("unknown"),
  options: z.record(z.string(), z.string()),
  price: moneySchema,
  discountAmount: moneySchema.optional(),
});

export const importedProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().min(1),
  categoryId: z.enum([
    "category-men",
    "category-women",
    "category-accessories",
  ]),
  productType: z.string().min(1),
  gender: z.enum(["men", "women", "unisex", "unknown"]),
  collectionIds: z.array(z.string()),
  collectionName: z.string().optional(),
  images: z.array(importedImageSchema),
  variants: z.array(importedVariantSchema).min(1),
  price: moneySchema,
  discountAmount: moneySchema.optional(),
  featured: z.boolean(),
  tags: z.array(z.string()),
  colors: z.array(z.string()),
  sizes: z.array(z.string()),
  material: z.string().optional(),
  care: z.string().optional(),
  modelInformation: z.string().optional(),
  dataSource: z.literal("spreadsheet"),
  fallbacks: z.array(
    z.enum([
      "availability-unknown",
      "description-missing",
      "gender-inferred-from-sheet-group",
      "gender-unknown",
      "images-missing",
      "size-missing",
      "color-missing",
    ]),
  ),
  source: z.object({
    workbook: z.literal("docs/data-toolor.xlsx"),
    sheet: z.string().min(1),
    rows: z.array(z.number().int().positive()).min(1),
    originalSkus: z.array(z.string().min(1)).min(1),
    productUrl: z.url().nullable(),
  }),
});

export const generatedProductFileSchema = z.object({
  source: z.object({
    workbook: z.literal("docs/data-toolor.xlsx"),
    sha256: z.string().length(64),
    generatedAt: z.iso.datetime(),
    worksheetCount: z.number().int().positive(),
    productWorksheetCount: z.number().int().positive(),
  }),
  products: z.array(importedProductSchema).min(20).max(25),
});

export type ImportedProduct = z.infer<typeof importedProductSchema>;
export type GeneratedProductFile = z.infer<typeof generatedProductFileSchema>;
