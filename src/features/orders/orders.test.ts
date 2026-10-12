// @vitest-environment node
import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { commerce } from "@/lib/commerce";
import { resolveOrderRequest } from "@/features/checkout/order-request";
import { CheckoutService } from "@/features/checkout/service";
import { DeliveryUncertainError } from "@/features/checkout/telegram";
import type { CheckoutRequest } from "@/features/checkout/schema";
import {
  OrderRepository,
  type ConditionalStore,
  type StoredOrder,
} from "./repository";
import { OrderBot, type TelegramUpdate } from "./bot";
import { orderButtons, menuButtons } from "./presentation";

class TestStore implements ConditionalStore {
  entries = new Map<string, { value: unknown; etag: string }>();
  counter = 0;
  async get(key: string) {
    return structuredClone(this.entries.get(key) ?? null);
  }
  async set(
    key: string,
    value: unknown,
    condition: { onlyIfNew: true } | { onlyIfMatch: string },
  ) {
    const old = this.entries.get(key);
    if (
      "onlyIfNew" in condition
        ? Boolean(old)
        : old?.etag !== condition.onlyIfMatch
    )
      return false;
    this.entries.set(key, {
      value: structuredClone(value),
      etag: String(++this.counter),
    });
    return true;
  }
  async keys(prefix: string) {
    return [...this.entries.keys()].filter((key) => key.startsWith(prefix));
  }
}
async function fixture(): Promise<CheckoutRequest> {
  const product = (await commerce.getFeaturedProducts(1))[0]!;
  const variant = product.variants[0]!;
  return {
    requestId: randomUUID(),
    locale: "ru",
    consent: true,
    website: "",
    delivery: "regions",
    customer: {
      name: "Тестовый покупатель",
      phone: "+00000000000",
      email: "test@example.com",
      city: "Тестовый город",
      address: "Вымышленный адрес",
      comment: "Не реальная покупка",
    },
    items: [
      {
        productId: product.id,
        slug: product.slug,
        variantId: variant.id,
        quantity: 2,
        expectedUnitAmount: variant.price.amount,
      },
    ],
  };
}
async function stored(repository: OrderRepository) {
  const input = await fixture();
  const order = await resolveOrderRequest(input, commerce);
  return repository.create(
    order,
    createHash("sha256").update(JSON.stringify(input)).digest("hex"),
  );
}
const callback = (
  record: StoredOrder,
  action = "take",
  actor = 123,
): TelegramUpdate => ({
  update_id: 1,
  callback_query: {
    id: randomUUID(),
    from: { id: actor },
    message: { message_id: 7, chat: { id: 123, type: "private" } },
    data: `o:${record.order.requestId}:${record.workflowRevision}:${action}`,
  },
});

describe("durable order repository", () => {
  it("preserves snapshots and states across repository/instance recreation", async () => {
    const store = new TestStore();
    const repo = new OrderRepository(store);
    const first = await stored(repo);
    await repo.transition(
      first.record.order.requestId,
      1,
      "working",
      "123",
      "take-1",
    );
    const reopened = await new OrderRepository(store).get(
      first.record.order.requestId,
    );
    expect(reopened?.record.status).toBe("working");
    expect(reopened?.record.order).toEqual(first.record.order);
    expect(reopened?.record.assignedTo).toBe("123");
    expect(reopened?.record.history).toHaveLength(2);
  });
  it("recovers initialization after a crash, without resetting an existing record", async () => {
    const store = new TestStore();
    const repo = new OrderRepository(store);
    const first = await stored(repo);
    store.entries.delete(first.key);
    const recovered = await repo.get(first.record.order.requestId);
    expect(recovered?.record).toEqual(first.record);
    await repo.transition(
      first.record.order.requestId,
      1,
      "working",
      "123",
      "event",
    );
    await repo.create(first.record.order, first.record.fingerprint);
    expect((await repo.get(first.record.order.requestId))?.record.status).toBe(
      "working",
    );
  });
  it("makes concurrent claims converge on one timestamp/snapshot", async () => {
    const repo = new OrderRepository(new TestStore());
    const input = await fixture();
    const order = await resolveOrderRequest(input, commerce);
    const results = await Promise.all([
      repo.create(order, "same"),
      repo.create({ ...order, createdAt: "2026-10-12T00:00:00.000Z" }, "same"),
    ]);
    expect(results[0]!.key).toBe(results[1]!.key);
    expect(results[0]!.record.order).toEqual(results[1]!.record.order);
  });
  it("rejects stale buttons, deduplicates event IDs and forbids skipping/reversing states", async () => {
    const repo = new OrderRepository(new TestStore());
    const initial = await stored(repo);
    const id = initial.record.order.requestId;
    expect((await repo.transition(id, 1, "completed", "123", "bad")).kind).toBe(
      "invalid",
    );
    expect((await repo.transition(id, 1, "working", "123", "take")).kind).toBe(
      "changed",
    );
    expect((await repo.transition(id, 1, "working", "123", "take")).kind).toBe(
      "unchanged",
    );
    expect((await repo.transition(id, 1, "cancelled", "123", "old")).kind).toBe(
      "stale",
    );
    await repo.transition(id, 2, "shipped", "123", "ship");
    expect(
      (await repo.transition(id, 3, "cancelled", "123", "bad2")).kind,
    ).toBe("invalid");
    await repo.transition(id, 3, "completed", "123", "done");
    expect(
      (await repo.get(id))?.record.history.map((event) => event.status),
    ).toEqual(["new", "working", "shipped", "completed"]);
  });
  it("allows only one concurrent workflow transition to win", async () => {
    const repo = new OrderRepository(new TestStore());
    const initial = await stored(repo);
    const id = initial.record.order.requestId;
    const results = await Promise.all([
      repo.transition(id, 1, "working", "123", "take"),
      repo.transition(id, 1, "cancelled", "123", "cancel"),
    ]);
    expect(results.filter((result) => result.kind === "changed")).toHaveLength(
      1,
    );
    expect((await repo.get(id))?.record.history).toHaveLength(2);
  });
  it("keeps workflow buttons valid when a notification receipt is saved", async () => {
    const repo = new OrderRepository(new TestStore());
    const initial = await stored(repo);
    await repo.replace(initial, {
      ...initial.record,
      revision: 2,
      delivery: "sent",
      messageId: 7,
    });
    expect(
      (
        await repo.transition(
          initial.record.order.requestId,
          1,
          "working",
          "123",
          "take",
        )
      ).kind,
    ).toBe("changed");
  });
  it("paginates newest-first and keeps all filtered records reachable", async () => {
    const repo = new OrderRepository(new TestStore());
    for (let i = 0; i < 15; i++) {
      const order = await resolveOrderRequest(await fixture(), commerce);
      order.createdAt = new Date(Date.UTC(2026, 9, 12, 0, i)).toISOString();
      await repo.create(order, String(i));
      if (i % 2 === 0)
        await repo.transition(order.requestId, 1, "working", "123", String(i));
    }
    const first = await repo.list("all");
    const second = await repo.list("all", first.nextOffset!);
    expect(first.items).toHaveLength(10);
    expect(second.items).toHaveLength(5);
    expect(second.nextOffset).toBeNull();
    expect(first.items[0]!.order.createdAt).toBe("2026-10-12T00:14:00.000Z");
    expect((await repo.list("working")).items).toHaveLength(8);
  });
});

describe("persistent checkout admission", () => {
  it("saves before dispatch and prevents duplicate sends across service instances", async () => {
    const repo = new OrderRepository(new TestStore());
    const input = await fixture();
    const send = vi.fn(async () => {
      expect((await repo.get(input.requestId))?.record.delivery).toBe(
        "dispatching",
      );
      return { messageId: 7, asFile: false };
    });
    const service = () =>
      new CheckoutService({
        provider: commerce,
        ready: () => true,
        send,
        repository: () => repo,
      });
    const results = await Promise.all([
      service().submit(input),
      service().submit(input),
    ]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(results.some((result) => result.body.ok)).toBe(true);
    expect((await service().submit(input)).body.ok).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("retains an ambiguous dispatch across cold starts and preserves the snapshot", async () => {
    const repo = new OrderRepository(new TestStore());
    const input = await fixture();
    const send = vi.fn(async () => {
      throw new DeliveryUncertainError();
    });
    const service = () =>
      new CheckoutService({
        provider: commerce,
        ready: () => true,
        send,
        repository: () => repo,
      });
    expect((await service().submit(input)).body).toMatchObject({
      code: "delivery_uncertain",
    });
    expect((await service().submit(input)).body).toMatchObject({
      code: "delivery_uncertain",
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect((await repo.get(input.requestId))?.record.order.customer).toEqual(
      input.customer,
    );
  });
  it("fails closed on storage errors before dispatch", async () => {
    const repo = new OrderRepository(new TestStore());
    vi.spyOn(repo, "get").mockRejectedValue(new Error("private SDK error"));
    const send = vi.fn();
    const service = new CheckoutService({
      provider: commerce,
      ready: () => true,
      send,
      repository: () => repo,
    });
    const result = await service.submit(await fixture());
    expect(result.status).toBe(503);
    expect(send).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("private SDK error");
  });
  it("rejects changing the payload behind an existing persistent reference", async () => {
    const repo = new OrderRepository(new TestStore());
    const input = await fixture();
    const send = vi.fn(async () => ({ messageId: 7, asFile: false }));
    const service = () =>
      new CheckoutService({
        provider: commerce,
        ready: () => true,
        send,
        repository: () => repo,
      });
    await service().submit(input);
    expect(
      (
        await service().submit({
          ...input,
          customer: { ...input.customer, name: "Another" },
        })
      ).status,
    ).toBe(409);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("private staff bot", () => {
  async function setup() {
    const repository = new OrderRepository(new TestStore());
    const entry = await stored(repository);
    const api = vi.fn<
      typeof import("@/features/checkout/telegram").telegramApi
    >(async () => true);
    const sendOrder = vi.fn(async () => ({ messageId: 7, asFile: false }));
    const bot = new OrderBot({
      repository,
      chatId: "123",
      operatorId: "123",
      api,
      sendOrder,
    });
    return { bot, repository, record: entry.record, api, sendOrder };
  }
  it("denies another account before any order lookup or data disclosure", async () => {
    const { bot, repository, record, api } = await setup();
    const get = vi.spyOn(repository, "get");
    await bot.handle(callback(record, "take", 456));
    expect(get).not.toHaveBeenCalled();
    expect(api).toHaveBeenCalledTimes(1);
    expect(api.mock.calls[0]?.[0]).toBe("answerCallbackQuery");
    expect(JSON.stringify(api.mock.calls)).not.toContain(
      record.order.customer.name,
    );
  });
  it("denies group chats even when the sender is the authorized operator", async () => {
    const { bot, record, repository } = await setup();
    const get = vi.spyOn(repository, "get");
    const update = callback(record);
    update.callback_query!.message!.chat.type = "group";
    await bot.handle(update);
    expect(get).not.toHaveBeenCalled();
  });
  it("renders the menu and history only to the approved private operator", async () => {
    const { bot, api } = await setup();
    await bot.handle({
      update_id: 1,
      message: {
        message_id: 2,
        from: { id: 123 },
        chat: { id: 123, type: "private" },
        text: "/start",
      },
    });
    expect(JSON.stringify(api.mock.calls)).toContain("Рабочая панель TOOLOR");
    await bot.handle({
      update_id: 2,
      message: {
        message_id: 3,
        from: { id: 123 },
        chat: { id: 123, type: "private" },
        text: "/orders",
      },
    });
    expect(JSON.stringify(api.mock.calls)).toContain("Тестовый покупатель");
  });
  it("changes state and edits the card, rather than sending duplicate order notifications", async () => {
    const { bot, repository, record, api, sendOrder } = await setup();
    const event = callback(record);
    await bot.handle(event);
    await bot.handle(event);
    expect((await repository.get(record.order.requestId))?.record.status).toBe(
      "working",
    );
    expect(
      (await repository.get(record.order.requestId))?.record.history,
    ).toHaveLength(2);
    expect(api.mock.calls.some((call) => call[0] === "editMessageText")).toBe(
      true,
    );
    expect(sendOrder).not.toHaveBeenCalled();
  });
  it("requires a separate confirmation to cancel and handles document cards", async () => {
    const { bot, repository, record, api } = await setup();
    await bot.handle(callback(record, "ask"));
    expect((await repository.get(record.order.requestId))?.record.status).toBe(
      "new",
    );
    expect(JSON.stringify(api.mock.calls)).toContain("Да, отменить");
    const entry = (await repository.get(record.order.requestId))!;
    await repository.replace(entry, {
      ...entry.record,
      revision: entry.record.revision + 1,
      messageId: 7,
      asFile: true,
    });
    await bot.handle(callback(record, "cancel"));
    expect((await repository.get(record.order.requestId))?.record.status).toBe(
      "cancelled",
    );
    expect(
      api.mock.calls.some((call) => call[0] === "editMessageCaption"),
    ).toBe(true);
  });
  it("still processes a durable action when Telegram cannot acknowledge an expired callback", async () => {
    const { bot, repository, record, api } = await setup();
    api.mockRejectedValueOnce(new Error("Query is too old"));
    await bot.handle(callback(record));
    expect((await repository.get(record.order.requestId))?.record.status).toBe(
      "working",
    );
    expect(
      api.mock.calls.some(([method]) => method === "editMessageText"),
    ).toBe(true);
  });
  it("bounds history previews without truncating stored customer data", async () => {
    const { bot, repository, record, api } = await setup();
    const entry = (await repository.get(record.order.requestId))!;
    const name = "<&".repeat(50);
    await repository.replace(entry, {
      ...entry.record,
      revision: entry.record.revision + 1,
      order: {
        ...entry.record.order,
        customer: { ...entry.record.order.customer, name },
      },
    });
    await bot.handle({
      update_id: 3,
      message: {
        message_id: 4,
        from: { id: 123 },
        chat: { id: 123, type: "private" },
        text: "/orders",
      },
    });
    const preview = api.mock.calls.find(
      ([method]) => method === "sendMessage",
    )?.[1];
    expect(JSON.stringify(preview)).not.toContain(name);
    expect(JSON.stringify(preview)).toContain("&lt;&amp;");
    expect(
      (await repository.get(record.order.requestId))?.record.order.customer
        .name,
    ).toBe(name);
  });
  it("ignores malformed action/UUID data and keeps callback payloads within Telegram's byte limit", async () => {
    const { bot, record, repository } = await setup();
    const get = vi.spyOn(repository, "get");
    const update = callback(record);
    update.callback_query!.data = "o:not-a-uuid:1:take";
    await bot.handle(update);
    expect(get).not.toHaveBeenCalled();
    for (const keyboard of [
      orderButtons(record.order.requestId, 999999, "working"),
      menuButtons(),
    ])
      for (const row of keyboard.inline_keyboard)
        for (const button of row)
          expect(Buffer.byteLength(button.callback_data)).toBeLessThanOrEqual(
            64,
          );
  });
});
