import { NextRequest } from "next/server";
import sharp from "sharp";

import {
  categoryMosaicImagesSchema,
  saveImage,
  updateCategoryMosaicImage,
} from "@/features/admin/catalog-store";
import { adminGate, privateJson } from "@/features/admin/http";

export const runtime = "nodejs";

const maxUploadBytes = 4_000_000;
const allowedFormats = new Set(["jpeg", "png", "webp", "avif"]);
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export async function POST(request: NextRequest) {
  const denied = adminGate(request, true);
  if (denied) return denied;
  try {
    const form = await request.formData();
    const key = categoryMosaicImagesSchema.keyof().safeParse(form.get("key"));
    const file = form.get("file");
    if (!key.success || !(file instanceof File))
      return privateJson({ error: "Выберите карточку и фотографию" }, 400);
    if (file.size === 0 || file.size > maxUploadBytes)
      return privateJson({ error: "Фото должно быть меньше 4 МБ" }, 400);
    if (file.type && !allowedMimeTypes.has(file.type))
      return privateJson(
        { error: "Поддерживаются JPG, PNG, WebP и AVIF без анимации" },
        400,
      );

    const input = Buffer.from(await file.arrayBuffer());
    const source = sharp(input, {
      limitInputPixels: 40_000_000,
      failOn: "error",
    });
    const metadata = await source.metadata();
    if (
      !metadata.format ||
      !allowedFormats.has(metadata.format) ||
      (metadata.pages ?? 1) > 1
    )
      return privateJson(
        { error: "Поддерживаются JPG, PNG, WebP и AVIF без анимации" },
        400,
      );
    const optimized = await source
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 92, effort: 4 })
      .toBuffer();
    if (optimized.byteLength > maxUploadBytes)
      return privateJson(
        { error: "После обработки фото слишком большое" },
        400,
      );

    const id = await saveImage(optimized);
    if (!(await updateCategoryMosaicImage(key.data, id)))
      return privateJson(
        { error: "Фотографии изменились. Обновите страницу и повторите." },
        409,
      );
    return privateJson({ image: `/api/catalog-image/${id}` });
  } catch {
    return privateJson({ error: "Не удалось загрузить фотографию" }, 422);
  }
}

export async function DELETE(request: NextRequest) {
  const denied = adminGate(request, true);
  if (denied) return denied;
  const raw: unknown = await request.json().catch(() => null);
  const key = categoryMosaicImagesSchema
    .keyof()
    .safeParse(raw && typeof raw === "object" && "key" in raw ? raw.key : null);
  if (!key.success) return privateJson({ error: "Карточка не найдена" }, 400);
  try {
    if (!(await updateCategoryMosaicImage(key.data, null)))
      return privateJson(
        { error: "Фотографии изменились. Обновите страницу и повторите." },
        409,
      );
    return privateJson({ ok: true });
  } catch {
    return privateJson({ error: "Не удалось вернуть фото из каталога" }, 503);
  }
}
