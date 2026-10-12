import { createHash } from "node:crypto";

import type { CommerceProvider } from "@/lib/commerce";
import {
  CartChangedError,
  resolveOrderRequest,
  type OrderRequest,
} from "./order-request";
import { requestNumber, type CheckoutRequest } from "./schema";
import { TelegramRejectedError } from "./telegram";
import type {
  OrderRepository,
  StoredOrder,
  VersionedOrder,
} from "@/features/orders/repository";
import type { TelegramReceipt } from "./telegram";

type Result = {
  status: number;
  body:
    { ok: true; number: string } | { ok: false; code: string; number?: string };
};
type Entry = { fingerprint: string; expires: number; promise: Promise<Result> };
type Bucket = { count: number; expires: number };
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

/** Bounded per-process coalescing and abuse protection supplement the optional
 * durable repository. Rate limits are not distributed; see launch requirements. */
export class CheckoutService {
  private readonly requests = new Map<string, Entry>();
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly dependencies: {
      provider: CommerceProvider;
      ready: () => boolean;
      send: (
        order: OrderRequest,
        record?: StoredOrder,
      ) => Promise<TelegramReceipt | void>;
      repository?: () => OrderRepository | undefined;
      now?: () => number;
    },
  ) {}

  async submit(input: CheckoutRequest): Promise<Result> {
    const now = (this.dependencies.now ?? Date.now)();
    for (const [key, value] of this.requests)
      if (value.expires <= now) this.requests.delete(key);
    for (const [key, value] of this.buckets)
      if (value.expires <= now) this.buckets.delete(key);
    const fingerprint = hash(JSON.stringify(input));
    const existing = this.requests.get(input.requestId);
    if (existing)
      return existing.fingerprint === fingerprint
        ? existing.promise
        : { status: 409, body: { ok: false, code: "request_conflict" } };
    if (!this.dependencies.ready())
      return { status: 503, body: { ok: false, code: "not_configured" } };
    if (this.requests.size >= 1024 || this.buckets.size >= 2048)
      return { status: 503, body: { ok: false, code: "busy" } };
    const phoneKey = hash(input.customer.phone.replace(/\D/g, ""));
    const globalKey = "global";
    if (
      (this.buckets.get(phoneKey)?.count ?? 0) >= 3 ||
      (this.buckets.get(globalKey)?.count ?? 0) >= 20
    ) {
      return { status: 429, body: { ok: false, code: "rate_limited" } };
    }
    for (const [key, windowMs] of [
      [phoneKey, 600_000],
      [globalKey, 60_000],
    ] as const) {
      const bucket = this.buckets.get(key) ?? {
        count: 0,
        expires: now + windowMs,
      };
      bucket.count++;
      this.buckets.set(key, bucket);
    }
    const promise = this.deliver(input).then((result) => {
      if (!result.body.ok && result.body.code !== "delivery_uncertain")
        this.requests.delete(input.requestId);
      return result;
    });
    this.requests.set(input.requestId, {
      fingerprint,
      expires: now + 1_800_000,
      promise,
    });
    return promise;
  }

  private async deliver(input: CheckoutRequest): Promise<Result> {
    let repository: OrderRepository | undefined;
    let stored: VersionedOrder | null = null;
    const fingerprint = hash(JSON.stringify(input));
    try {
      repository = this.dependencies.repository?.();
      stored = repository ? await repository.get(input.requestId) : null;
    } catch {
      return { status: 503, body: { ok: false, code: "unavailable" } };
    }
    let order: OrderRequest;
    try {
      order =
        stored?.record.order ??
        (await resolveOrderRequest(input, this.dependencies.provider));
    } catch (error) {
      return {
        status: error instanceof CartChangedError ? 409 : 503,
        body: {
          ok: false,
          code:
            error instanceof CartChangedError ? "cart_changed" : "unavailable",
        },
      };
    }
    if (repository) {
      try {
        stored ??= await repository.create(order, fingerprint);
        if (stored.record.fingerprint !== fingerprint)
          return { status: 409, body: { ok: false, code: "request_conflict" } };
        if (stored.record.delivery === "sent")
          return {
            status: 200,
            body: { ok: true, number: stored.record.order.number },
          };
        if (!["pending", "rejected"].includes(stored.record.delivery))
          return this.uncertain(input);
        const claimed = await repository.replace(stored, {
          ...stored.record,
          delivery: "dispatching",
          revision: stored.record.revision + 1,
        });
        if (!claimed) return this.uncertain(input);
      } catch {
        // Nothing was dispatched: fail closed and retain the cart.
        return { status: 503, body: { ok: false, code: "unavailable" } };
      }
    }
    try {
      const current = repository
        ? (await repository.get(input.requestId))?.record
        : undefined;
      const receipt = await this.dependencies.send(
        order,
        current ? { ...current, delivery: "sent" } : undefined,
      );
      if (repository)
        await this.saveDelivery(repository, input.requestId, "sent", receipt);
      return { status: 200, body: { ok: true, number: order.number } };
    } catch (error) {
      const rejected = error instanceof TelegramRejectedError;
      if (repository) {
        try {
          await this.saveDelivery(
            repository,
            input.requestId,
            rejected ? "rejected" : "uncertain",
          );
        } catch {
          return this.uncertain(input);
        }
      }
      if (rejected)
        return { status: 502, body: { ok: false, code: "delivery_rejected" } };
      // Unknown failures after dispatch are ambiguous. Never automatically
      // re-send the same request in this process, and do not clear the cart.
      return this.uncertain(input);
    }
  }

  private uncertain(input: CheckoutRequest): Result {
    return {
      status: 504,
      body: {
        ok: false,
        code: "delivery_uncertain",
        number: requestNumber(input.requestId),
      },
    };
  }

  private async saveDelivery(
    repository: OrderRepository,
    id: string,
    delivery: StoredOrder["delivery"],
    receipt?: TelegramReceipt | void,
  ) {
    // A specialist may already have clicked while the receipt was being saved.
    // Merge only transport fields, preserving their status/audit changes.
    for (let attempt = 0; attempt < 3; attempt++) {
      const entry = await repository.get(id);
      if (!entry) throw new Error("Order missing");
      if (
        await repository.replace(entry, {
          ...entry.record,
          delivery,
          revision: entry.record.revision + 1,
          ...(receipt
            ? { messageId: receipt.messageId, asFile: receipt.asFile }
            : {}),
        })
      )
        return;
    }
    throw new Error("Order update conflict");
  }
}
