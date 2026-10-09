import { z } from "zod";

import type { ProductFilters } from "@/types";

const querySchema = z.object({
  category: z.string().trim().min(1).optional(),
  gender: z
    .enum(["men", "women", "unisex", "unknown"])
    .optional()
    .catch(undefined),
  size: z.string().trim().max(40).optional().catch(undefined),
  color: z.string().trim().max(60).optional().catch(undefined),
  collection: z.string().trim().min(1).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z
    .enum(["featured", "newest", "price-asc", "price-desc"])
    .catch("featured"),
  page: z.coerce.number().int().positive().max(1_000_000).catch(1),
  minPrice: z.coerce
    .number()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER / 100)
    .optional()
    .catch(undefined),
  maxPrice: z.coerce
    .number()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER / 100)
    .optional()
    .catch(undefined),
});

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalized = candidate?.trim();

  return normalized ? normalized : undefined;
}

export function parseProductQuery(params: RawSearchParams): ProductFilters {
  const parsed = querySchema.parse({
    category: first(params.category),
    gender: first(params.gender),
    size: first(params.size),
    color: first(params.color),
    collection: first(params.collection),
    q: first(params.q)?.slice(0, 100),
    sort: first(params.sort),
    page: first(params.page),
    minPrice: first(params.minPrice),
    maxPrice: first(params.maxPrice),
  });

  return {
    category: parsed.category,
    gender: parsed.gender,
    size: parsed.size,
    color: parsed.color,
    collection: parsed.collection,
    search: parsed.q,
    sort: parsed.sort,
    page: parsed.page,
    pageSize: 12,
    minPrice:
      parsed.minPrice === undefined
        ? undefined
        : Math.round(parsed.minPrice * 100),
    maxPrice:
      parsed.maxPrice === undefined
        ? undefined
        : Math.round(parsed.maxPrice * 100),
  };
}
