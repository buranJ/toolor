import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";

import { adminGate, privateJson } from "@/features/admin/http";
import { saveNewDraft } from "@/features/admin/catalog-store";
import { validateImageUrl } from "@/features/admin/image-import";
import { generatedProductFileSchema } from "@/lib/commerce/importers/toolor-product-schema";
import generatedCatalog from "@/data/toolor-products.generated.json";
import { inspectUploadedWorkbook } from "@/lib/commerce/importers/workbook-parser";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const denied = adminGate(request, true);
  if (denied) return denied;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !/\.xlsx$/i.test(file.name))
      return privateJson({ error: "Выберите файл Excel .xlsx" }, 400);
    if (file.size < 100 || file.size > 4_000_000)
      return privateJson({ error: "Размер файла должен быть меньше 4 МБ" }, 400);
    const bytes = Buffer.from(await file.arrayBuffer());
    const parsed = await inspectUploadedWorkbook(bytes, file.name.slice(0, 120));
    if (parsed.products.length > 2_000 || parsed.imageUrls.length > 2_000)
      return privateJson({ error: "Таблица слишком большая" }, 400);
    parsed.imageUrls.forEach(validateImageUrl);
    const unchanged = parsed.source.sha256 === generatedCatalog.source.sha256;
    const catalog = generatedProductFileSchema.parse(
      unchanged
        ? {
            ...generatedCatalog,
            source: { ...parsed.source },
          }
        : { source: parsed.source, products: parsed.products },
    );
    const draft = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      catalog,
      imageUrls: unchanged ? [] : parsed.imageUrls,
      prepared: {},
    };
    await saveNewDraft(draft);
    return privateJson({
      ok: true,
      draft: {
        id: draft.id,
        productCount: catalog.products.length,
        variantCount: catalog.products.reduce((sum, product) => sum + product.variants.length, 0),
        imageCount: draft.imageUrls.length,
        sample: catalog.products.slice(0, 12).map((product) => product.name),
      },
    });
  } catch (error: unknown) {
    return privateJson(
      { error: error instanceof Error ? error.message : "Таблицу не удалось загрузить" },
      400,
    );
  }
}
