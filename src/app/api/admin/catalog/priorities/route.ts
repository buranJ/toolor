import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

import {
  prioritiesSchema,
  savePriorities,
} from "@/features/admin/catalog-store";
import { adminGate, privateJson } from "@/features/admin/http";
import { locales } from "@/i18n";
import { loadPublishedCatalog } from "@/lib/commerce/catalog-data";

export const runtime = "nodejs";

function validOrder(input: string[], available: string[]) {
  const wanted = new Set(input);
  return (
    wanted.size === input.length &&
    input.length === available.length &&
    available.every((id) => wanted.has(id))
  );
}

export async function POST(request: NextRequest) {
  const denied = adminGate(request, true);
  if (denied) return denied;
  const raw = await request.json().catch(() => null);
  const parsed = prioritiesSchema.safeParse(raw);
  if (!parsed.success)
    return privateJson({ error: "Порядок товаров некорректен" }, 400);
  try {
    const catalog = await loadPublishedCatalog();
    if (
      !validOrder(parsed.data.productIds, catalog.products.map((item) => item.id)) ||
      !validOrder(parsed.data.collectionIds, catalog.collections.map((item) => item.id))
    ) {
      return privateJson({ error: "Каталог изменился. Обновите страницу." }, 409);
    }
    await savePriorities(parsed.data);
    for (const locale of locales) {
      revalidatePath(`/${locale}`);
      revalidatePath(`/${locale}/about`);
    }
    return privateJson({ ok: true });
  } catch {
    return privateJson({ error: "Не удалось сохранить порядок" }, 503);
  }
}
