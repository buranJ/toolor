import { createHash } from "node:crypto";

import { getStore } from "@netlify/blobs";
import { z } from "zod";

import { generatedProductFileSchema } from "@/lib/commerce/importers/toolor-product-schema";

const activeSchema = z.object({
  id: z.uuid(),
  publishedAt: z.iso.datetime(),
});

export const prioritiesSchema = z.object({
  productIds: z.array(z.string()).max(2000),
  collectionIds: z.array(z.string()).max(200),
});

const draftSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  catalog: generatedProductFileSchema,
  imageUrls: z.array(z.url()).max(2000),
  prepared: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
});

export type DraftCatalog = z.infer<typeof draftSchema>;
export type CatalogPriorities = z.infer<typeof prioritiesSchema>;

function store() {
  return getStore({
    name: "toolor-catalog-production",
    consistency: "strong",
    fetch: async (input, init) => {
      const response = await fetch(input, {
        ...init,
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (init?.method?.toUpperCase() === "PUT" && ![200, 412].includes(response.status))
        throw new Error("Catalog storage write rejected");
      return response;
    },
  });
}

export function catalogStorageEnabled() {
  return process.env.CATALOG_STORAGE_DRIVER === "netlify";
}

export function assertCatalogWritable() {
  if (!catalogStorageEnabled()) throw new Error("Catalog storage unavailable");
  if (process.env.CONTEXT && process.env.CONTEXT !== "production")
    throw new Error("Admin writes are disabled outside production");
}

function missingBlobsEnvironment(error: unknown) {
  return error instanceof Error && error.name === "MissingBlobsEnvironmentError";
}

export async function getActiveCatalog() {
  if (!catalogStorageEnabled()) return null;
  try {
    const pointer = await store().get("catalog/active", { type: "json" });
    if (!pointer) return null;
    const active = activeSchema.parse(pointer as unknown);
    const raw = await store().get(`catalog/versions/${active.id}`, {
      type: "json",
    });
    if (!raw) throw new Error("Published catalog version is missing");
    return { active, catalog: generatedProductFileSchema.parse(raw as unknown) };
  } catch (error: unknown) {
    // Next.js pre-renders ISR pages before Netlify installs the runtime Blobs
    // context. Those pages start from the bundled catalog and revalidate later.
    if (missingBlobsEnvironment(error)) return null;
    throw error;
  }
}

export async function getPriorities(): Promise<CatalogPriorities> {
  if (!catalogStorageEnabled()) return { productIds: [], collectionIds: [] };
  try {
    const raw = await store().get("catalog/priorities", { type: "json" });
    return raw
      ? prioritiesSchema.parse(raw as unknown)
      : { productIds: [], collectionIds: [] };
  } catch (error: unknown) {
    if (missingBlobsEnvironment(error)) return { productIds: [], collectionIds: [] };
    throw error;
  }
}

export async function savePriorities(value: CatalogPriorities) {
  assertCatalogWritable();
  await store().setJSON("catalog/priorities", prioritiesSchema.parse(value));
}

export async function getDraft() {
  assertCatalogWritable();
  const entry = await store().getWithMetadata("catalog/draft", {
    type: "json",
    consistency: "strong",
  });
  if (!entry) return null;
  if (!entry.etag) throw new Error("Draft has no storage version");
  return { draft: draftSchema.parse(entry.data as unknown), etag: entry.etag };
}

export async function saveNewDraft(value: DraftCatalog) {
  assertCatalogWritable();
  await store().setJSON("catalog/draft", draftSchema.parse(value));
}

export async function replaceDraft(value: DraftCatalog, etag: string) {
  assertCatalogWritable();
  return (
    await store().setJSON("catalog/draft", draftSchema.parse(value), {
      onlyIfMatch: etag,
    })
  ).modified;
}

export async function publishDraft(value: DraftCatalog, etag: string) {
  assertCatalogWritable();
  const catalog = generatedProductFileSchema.parse(value.catalog);
  const key = `catalog/versions/${value.id}`;
  await store().setJSON(key, catalog, { onlyIfNew: true });
  const current = await getDraft();
  if (!current || current.etag !== etag || current.draft.id !== value.id)
    throw new Error("Draft changed before publication");
  await store().setJSON("catalog/active", {
    id: value.id,
    publishedAt: new Date().toISOString(),
  });
}

export function imageUrlKey(url: string) {
  return createHash("sha256").update(url).digest("hex");
}

export async function saveImage(bytes: Uint8Array) {
  assertCatalogWritable();
  const id = createHash("sha256").update(bytes).digest("hex");
  await store().set(`images/${id}`, Uint8Array.from(bytes).buffer, {
    onlyIfNew: true,
  });
  return id;
}

export async function getImage(id: string) {
  if (!catalogStorageEnabled() || !/^[a-f0-9]{64}$/.test(id)) return null;
  const value = await store().get(`images/${id}`, { type: "arrayBuffer" });
  return value ? new Uint8Array(value) : null;
}
