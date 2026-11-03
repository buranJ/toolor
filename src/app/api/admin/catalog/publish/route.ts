import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

import { getDraft, imageUrlKey, publishDraft } from "@/features/admin/catalog-store";
import { adminGate, privateJson } from "@/features/admin/http";
import { locales } from "@/i18n";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const denied = adminGate(request, true);
  if (denied) return denied;
  try {
    const current = await getDraft();
    if (!current) return privateJson({ error: "Черновик не найден" }, 404);
    const pending = current.draft.imageUrls.filter((url) => !current.draft.prepared[imageUrlKey(url)]);
    if (pending.length)
      return privateJson({ error: `Сначала подготовьте фотографии: осталось ${pending.length}` }, 409);
    const published = {
      ...current.draft,
      catalog: {
        ...current.draft.catalog,
        products: current.draft.catalog.products.map((product) => ({
          ...product,
          images: product.images.map((image) => {
            if (image.url.startsWith("/media/products/")) return image;
            const id = current.draft.prepared[imageUrlKey(image.url)];
            if (!id) throw new Error("Фото не подготовлено");
            return {
              ...image,
              url: `/api/catalog-image/${id}`,
              status: "reachable" as const,
              httpStatus: 200,
            };
          }),
        })),
      },
    };
    await publishDraft(published, current.etag);
    for (const locale of locales) {
      revalidatePath(`/${locale}`);
      revalidatePath(`/${locale}/about`);
    }
    return privateJson({ ok: true, productCount: published.catalog.products.length });
  } catch (error: unknown) {
    return privateJson({ error: error instanceof Error ? error.message : "Публикация не удалась" }, 503);
  }
}
