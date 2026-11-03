import { NextRequest } from "next/server";

import { adminGate, privateJson } from "@/features/admin/http";
import { getActiveCatalog, getDraft, imageUrlKey } from "@/features/admin/catalog-store";
import { loadPublishedCatalog } from "@/lib/commerce/catalog-data";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const denied = adminGate(request);
  if (denied) return denied;
  try {
    const [active, draftRecord, catalog] = await Promise.all([
      getActiveCatalog(),
      getDraft(),
      loadPublishedCatalog(),
    ]);
    const draft = draftRecord?.draft;
    const visibleDraft = draft && draft.id !== active?.active.id ? draft : null;
    return privateJson({
      active: active?.active ?? null,
      products: catalog.products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        image: product.images[0]?.url ?? null,
        price: product.price.amount,
        featured: product.featured,
        collectionName: product.collectionName ?? null,
      })),
      collections: catalog.collections.map((collection) => ({
        id: collection.id,
        name: collection.name,
        count: collection.productIds.length,
      })),
      priorities: {
        productIds: catalog.productOrder,
        collectionIds: catalog.collectionOrder,
      },
      draft: visibleDraft
        ? {
            id: visibleDraft.id,
            createdAt: visibleDraft.createdAt,
            workbook: visibleDraft.catalog.source.workbook,
            productCount: visibleDraft.catalog.products.length,
            variantCount: visibleDraft.catalog.products.reduce((sum, product) => sum + product.variants.length, 0),
            imageCount: visibleDraft.imageUrls.length,
            preparedCount: visibleDraft.imageUrls.filter((url) => visibleDraft.prepared[imageUrlKey(url)]).length,
            sample: visibleDraft.catalog.products.slice(0, 12).map((product) => product.name),
            preview: visibleDraft.catalog.products.map((product) => ({
              id: product.id,
              name: product.name,
              sku: product.source.originalSkus.join(", "),
              variants: product.variants.length,
            })),
          }
        : null,
    });
  } catch {
    return privateJson({ error: "Не удалось прочитать каталог" }, 503);
  }
}
