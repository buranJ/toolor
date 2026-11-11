import { z } from "zod";
import {
  referenceSchema,
  storedOrderSchema,
  type ConditionalStore,
} from "./repository";
import { namespaceSchema } from "./sqlite-store";

const entrySchema = z
  .object({
    key: z
      .string()
      .regex(/^(references\/[a-f0-9-]{36}|orders\/\d{15}-[a-f0-9-]{36})$/),
    value: z.unknown(),
  })
  .strict();
const archiveSchema = z
  .object({
    format: z.literal("toolor-orders"),
    version: z.literal(1),
    namespace: namespaceSchema,
    createdAt: z.iso.datetime(),
    entries: z.array(entrySchema).max(100_000),
  })
  .strict();
export type OrderArchive = z.infer<typeof archiveSchema>;

/** Validate the complete graph, not just individual JSON records. Preserve raw
 * values so even optional schema-v1 fields are not silently lost on migration. */
export function validateArchive(raw: unknown): OrderArchive {
  const archive = archiveSchema.parse(raw);
  const keys = new Set<string>();
  const references = new Map<string, z.infer<typeof referenceSchema>>();
  const records = new Map<string, z.infer<typeof storedOrderSchema>>();
  for (const entry of archive.entries) {
    if (keys.has(entry.key)) throw new Error("Duplicate archive key");
    keys.add(entry.key);
    if (entry.key.startsWith("references/")) {
      const ref = referenceSchema.parse(entry.value);
      const id = entry.key.slice("references/".length);
      const initial = ref.initial;
      const expectedKey = `orders/${String(999_999_999_999_999 - Date.parse(initial.order.createdAt)).padStart(15, "0")}-${id}`;
      if (
        initial.order.requestId !== id ||
        ref.key !== expectedKey ||
        initial.revision !== 1 ||
        initial.workflowRevision !== 1 ||
        initial.status !== "new" ||
        initial.delivery !== "pending"
      )
        throw new Error("Invalid immutable order reference");
      references.set(id, ref);
    } else {
      const record = storedOrderSchema.parse(entry.value);
      if (!entry.key.endsWith(`-${record.order.requestId}`))
        throw new Error("Order key mismatch");
      records.set(entry.key, record);
    }
  }
  for (const [key, record] of records) {
    const ref = references.get(record.order.requestId);
    if (
      !ref ||
      ref.key !== key ||
      ref.initial.fingerprint !== record.fingerprint ||
      JSON.stringify(ref.initial.order) !== JSON.stringify(record.order)
    )
      throw new Error("Order snapshot/reference mismatch");
  }
  // Reference-only records are valid crash-recovery claims. Preserve them;
  // never fabricate Telegram receipts or automatically resend notifications.
  return archive;
}

export function archiveSummary(archive: OrderArchive) {
  const references = archive.entries.filter((entry) =>
    entry.key.startsWith("references/"),
  ).length;
  const orders = archive.entries.length - references;
  return { references, orders, recoveryClaims: references - orders };
}

/** Source must be quiesced for final cutover. Double reads detect an unstable
 * export and fail before creating a backup file, instead of exporting a mix. */
export async function exportArchive(
  store: ConditionalStore,
  namespace: string,
): Promise<OrderArchive> {
  namespaceSchema.parse(namespace);
  const keys = (await store.keys("")).sort();
  if (keys.length > 100_000) throw new Error("Archive exceeds migration limit");
  const entries: OrderArchive["entries"] = [];
  const versions = new Map<string, string>();
  for (const key of keys) {
    const entry = await store.get(key);
    if (!entry) throw new Error("Storage changed during export");
    entries.push({ key, value: entry.value });
    versions.set(key, entry.etag);
  }
  const archive = validateArchive({
    format: "toolor-orders",
    version: 1,
    namespace,
    createdAt: new Date().toISOString(),
    entries,
  });
  if (JSON.stringify(keys) !== JSON.stringify((await store.keys("")).sort()))
    throw new Error("Storage changed during export");
  for (const key of keys) {
    if ((await store.get(key))?.etag !== versions.get(key))
      throw new Error("Storage changed during export");
  }
  return archive;
}
