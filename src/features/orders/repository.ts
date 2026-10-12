import { z } from "zod";
import type { OrderRequest } from "@/features/checkout/order-request";
import { checkoutRequestSchema } from "@/features/checkout/schema";

export const orderStatuses = [
  "new",
  "working",
  "shipped",
  "completed",
  "cancelled",
] as const;
export const statusSchema = z.enum(orderStatuses);
export type OrderStatus = z.infer<typeof statusSchema>;
const snapshotSchema = checkoutRequestSchema
  .omit({ website: true, items: true })
  .extend({
    number: z.string(),
    createdAt: z.iso.datetime(),
    subtotal: z.number().int().nonnegative(),
    items: z
      .array(
        z.object({
          productId: z.string(),
          slug: z.string(),
          variantId: z.string(),
          name: z.string(),
          variant: z.string(),
          sku: z.string(),
          options: z.record(z.string(), z.string()),
          quantity: z.number().int().positive(),
          unitAmount: z.number().int().nonnegative(),
        }),
      )
      .min(1)
      .max(20),
  });
export const storedOrderSchema = z.object({
  schemaVersion: z.literal(1),
  revision: z.number().int().positive(),
  workflowRevision: z.number().int().positive(),
  fingerprint: z.string(),
  order: snapshotSchema,
  status: statusSchema,
  assignedTo: z.string().optional(),
  delivery: z.enum(["pending", "dispatching", "sent", "rejected", "uncertain"]),
  messageId: z.number().int().positive().optional(),
  asFile: z.boolean().optional(),
  history: z
    .array(
      z.object({
        at: z.iso.datetime(),
        status: statusSchema,
        actor: z.string().optional(),
        eventId: z.string(),
      }),
    )
    .max(100),
});
export type StoredOrder = z.infer<typeof storedOrderSchema>;
export type VersionedOrder = { record: StoredOrder; etag: string; key: string };

/** Vendor-neutral conditional storage. A future SQLite/Postgres adapter implements
 * this contract; no Telegram/business code needs to know where data lives. */
export interface ConditionalStore {
  get(key: string): Promise<{ value: unknown; etag: string } | null>;
  set(
    key: string,
    value: unknown,
    condition: { onlyIfNew: true } | { onlyIfMatch: string },
  ): Promise<boolean>;
  keys(prefix: string): Promise<string[]>;
}
const referenceSchema = z.object({
  key: z.string().regex(/^orders\/\d{15}-[a-f0-9-]{36}$/),
  initial: storedOrderSchema,
});
const idSchema = z.uuid();

export class OrderRepository {
  constructor(private readonly store: ConditionalStore) {}

  async get(id: string): Promise<VersionedOrder | null> {
    idSchema.parse(id);
    const ref = await this.store.get(`references/${id}`);
    if (!ref) return null;
    const { key, initial } = referenceSchema.parse(ref.value);
    // Recover a crash between acquiring the immutable claim and materializing
    // the sortable record. Never overwrite an existing workflow record.
    let entry = await this.store.get(key);
    if (!entry) {
      await this.store.set(key, initial, { onlyIfNew: true });
      entry = await this.store.get(key);
    }
    if (!entry) throw new Error("Order storage unavailable");
    return {
      record: storedOrderSchema.parse(entry.value),
      etag: entry.etag,
      key,
    };
  }

  async create(
    order: OrderRequest,
    fingerprint: string,
  ): Promise<VersionedOrder> {
    idSchema.parse(order.requestId);
    const initial: StoredOrder = {
      schemaVersion: 1,
      revision: 1,
      workflowRevision: 1,
      fingerprint,
      order,
      status: "new",
      delivery: "pending",
      history: [
        {
          at: order.createdAt,
          status: "new",
          eventId: `created:${order.requestId}`,
        },
      ],
    };
    const key = `orders/${String(999_999_999_999_999 - Date.parse(order.createdAt)).padStart(15, "0")}-${order.requestId}`;
    // Atomic UUID claim across cold starts and instances. The losing request
    // reads the winner's timestamp/snapshot; the catalogue is never overwritten.
    await this.store.set(
      `references/${order.requestId}`,
      { key, initial },
      { onlyIfNew: true },
    );
    const entry = await this.get(order.requestId);
    if (!entry) throw new Error("Order storage unavailable");
    return entry;
  }

  async replace(entry: VersionedOrder, record: StoredOrder): Promise<boolean> {
    if (
      record.order.requestId !== entry.record.order.requestId ||
      record.revision !== entry.record.revision + 1
    )
      throw new Error("Invalid order revision");
    return this.store.set(entry.key, storedOrderSchema.parse(record), {
      onlyIfMatch: entry.etag,
    });
  }

  async transition(
    id: string,
    revision: number,
    status: OrderStatus,
    actor: string,
    eventId: string,
  ) {
    const entry = await this.get(id);
    if (!entry) return { kind: "missing" as const };
    const record = entry.record;
    if (record.history.some((event) => event.eventId === eventId))
      return { kind: "unchanged" as const, record };
    if (record.workflowRevision !== revision)
      return { kind: "stale" as const, record };
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      new: ["working", "cancelled"],
      working: ["shipped", "cancelled"],
      shipped: ["completed"],
      completed: [],
      cancelled: [],
    };
    if (!allowed[record.status].includes(status))
      return { kind: "invalid" as const, record };
    const next: StoredOrder = {
      ...record,
      revision: record.revision + 1,
      workflowRevision: record.workflowRevision + 1,
      status,
      ...(status === "working" ? { assignedTo: actor } : {}),
      history: [
        ...record.history,
        { at: new Date().toISOString(), status, actor, eventId },
      ],
    };
    if (!(await this.replace(entry, next)))
      return { kind: "stale" as const, record: (await this.get(id))!.record };
    return { kind: "changed" as const, record: next };
  }

  async list(status: OrderStatus | "all", offset = 0) {
    // Sort identifiers, not customer records. Read at most 100 snapshots per
    // interaction and return ten matches; filters never silently truncate history.
    const keys = (await this.store.keys("orders/")).sort();
    const items: StoredOrder[] = [];
    let cursor = offset;
    const end = Math.min(keys.length, offset + 100);
    while (cursor < end && items.length < 10) {
      const batch = await Promise.all(
        keys
          .slice(cursor, Math.min(end, cursor + 10))
          .map((key) => this.store.get(key)),
      );
      for (const entry of batch) {
        cursor++;
        if (entry) {
          const record = storedOrderSchema.parse(entry.value);
          if (status === "all" || record.status === status) items.push(record);
        }
        // Advance only over consumed entries: unused prefetched records remain
        // reachable on the next page, even with a sparse status filter.
        if (items.length === 10) break;
      }
    }
    return { items, nextOffset: cursor < keys.length ? cursor : null };
  }
}
