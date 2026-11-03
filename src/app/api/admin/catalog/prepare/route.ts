import { NextRequest } from "next/server";

import {
  getDraft,
  imageUrlKey,
  replaceDraft,
  saveImage,
} from "@/features/admin/catalog-store";
import { adminGate, privateJson } from "@/features/admin/http";
import { prepareCatalogImage } from "@/features/admin/image-import";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const denied = adminGate(request, true);
  if (denied) return denied;
  try {
    const current = await getDraft();
    if (!current) return privateJson({ error: "Сначала загрузите таблицу" }, 404);
    const pending = current.draft.imageUrls
      .filter((url) => !current.draft.prepared[imageUrlKey(url)])
      .slice(0, 3);
    if (!pending.length)
      return privateJson({ done: true, prepared: current.draft.imageUrls.length, total: current.draft.imageUrls.length });
    const entries = await Promise.all(
      pending.map(async (url) => [imageUrlKey(url), await saveImage(await prepareCatalogImage(url))] as const),
    );
    const next = {
      ...current.draft,
      prepared: { ...current.draft.prepared, ...Object.fromEntries(entries) },
    };
    if (!(await replaceDraft(next, current.etag)))
      return privateJson({ error: "Черновик изменился. Обновите страницу." }, 409);
    const prepared = next.imageUrls.filter((url) => next.prepared[imageUrlKey(url)]).length;
    return privateJson({ done: prepared === next.imageUrls.length, prepared, total: next.imageUrls.length });
  } catch (error: unknown) {
    return privateJson({ error: error instanceof Error ? error.message : "Фото не удалось подготовить" }, 422);
  }
}
