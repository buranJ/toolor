// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { commerce } from "@/lib/commerce";
import { checkoutRequestSchema, type CheckoutRequest } from "./schema";
import { CartChangedError, resolveOrderRequest } from "./order-request";
import { CheckoutService } from "./service";
import {
  DeliveryUncertainError,
  TelegramRejectedError,
  sendOrderToTelegram,
  telegramRequestHtml,
  telegramRequestText,
} from "./telegram";

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
      phone: "+996 555 000 111",
      email: "test@example.com",
      city: "Тестовый город",
      address: "Тестовая улица, дом 1",
      comment: "Тест, не реальная заявка",
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

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("order request validation and catalogue boundary", () => {
  it("accepts validated contacts, but no client-provided product names or payment mode", async () => {
    const input = await fixture();
    expect(checkoutRequestSchema.safeParse(input).success).toBe(true);
    expect(
      checkoutRequestSchema.safeParse({ ...input, payment: "card" }).success,
    ).toBe(false);
    expect(
      checkoutRequestSchema.safeParse({
        ...input,
        items: [{ ...input.items[0], name: "Injected" }],
      }).success,
    ).toBe(false);
  });
  it("rejects missing consent, honeypots, duplicate variants, quantities and invalid email/phone", async () => {
    const input = await fixture();
    for (const invalid of [
      { ...input, consent: false },
      { ...input, website: "spam" },
      { ...input, items: [] },
      { ...input, items: [...input.items, ...input.items] },
      { ...input, items: [{ ...input.items[0], quantity: 21 }] },
      { ...input, customer: { ...input.customer, email: "bad" } },
      { ...input, customer: { ...input.customer, phone: "---------" } },
      { ...input, customer: { ...input.customer, name: "Имя\nСумма: 0" } },
      { ...input, customer: { ...input.customer, comment: "x".repeat(1001) } },
    ])
      expect(checkoutRequestSchema.safeParse(invalid).success).toBe(false);
  });
  it("re-resolves authoritative names, SKU, options and prices without promising stock", async () => {
    const input = await fixture();
    const order = await resolveOrderRequest(input, commerce);
    expect(order.subtotal).toBe(input.items[0]!.expectedUnitAmount * 2);
    expect(order.items[0]!.sku).toBeTruthy();
    expect(order.items[0]!.options).toBeDefined();
    expect(telegramRequestText(order)).toContain(input.customer.phone);
    expect(telegramRequestText(order)).toContain("не оплаченный заказ");
  });
  it("rejects changed price, forged variant or wrong product ID", async () => {
    const input = await fixture();
    for (const item of [
      {
        ...input.items[0]!,
        expectedUnitAmount: input.items[0]!.expectedUnitAmount + 1,
      },
      { ...input.items[0]!, variantId: "fake-variant" },
      { ...input.items[0]!, productId: "fake-product" },
    ])
      await expect(
        resolveOrderRequest({ ...input, items: [item] }, commerce),
      ).rejects.toBeInstanceOf(CartChangedError);
  });
});

describe("Telegram transport (all calls mocked)", () => {
  function configure() {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "123456:synthetic_test_token");
    vi.stubEnv("TELEGRAM_CHAT_ID", "-100123456789");
    vi.stubEnv("TELEGRAM_MESSAGE_THREAD_ID", "");
  }
  it("uses only the server recipient, formatted HTML, hidden previews and confirmed message receipt", async () => {
    configure();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ ok: true, result: { message_id: 12 } }),
      );
    vi.stubGlobal("fetch", fetcher);
    const order = await resolveOrderRequest(await fixture(), commerce);
    await sendOrderToTelegram(order);
    const options = fetcher.mock.calls[0]?.[1] as RequestInit | undefined;
    const body = JSON.parse(options?.body as string) as Record<string, unknown>;
    expect(body.chat_id).toBe("-100123456789");
    expect(body.parse_mode).toBe("HTML");
    expect(body.text).toBe(telegramRequestHtml(order));
    expect(body.link_preview_options).toEqual({ is_disabled: true });
  });
  it("escapes buyer and catalogue markup while preserving readable sections and reference data", async () => {
    const order = await resolveOrderRequest(await fixture(), commerce);
    order.createdAt = "2026-10-09T08:30:38.948Z";
    order.customer.name = '<b>Buyer</b> & "Company"';
    order.customer.comment =
      '<a href="https://evil.example">link</a>\nSecond line';
    order.customer.address = "House <1> & street";
    order.items[0]!.name = "Model <b>bold</b>";
    order.items[0]!.options = { size: "44", color: "Blue & white" };
    const html = telegramRequestHtml(order);
    expect(html).toContain(
      "<b>&lt;b&gt;Buyer&lt;/b&gt; &amp; &quot;Company&quot;</b>",
    );
    expect(html).toContain(
      "&lt;a href=&quot;https://evil.example&quot;&gt;link&lt;/a&gt;\nSecond line",
    );
    expect(html).not.toContain('<a href="https://evil.example">');
    expect(html).toContain("House &lt;1&gt; &amp; street");
    expect(html).toContain("Model &lt;b&gt;bold&lt;/b&gt;");
    expect(html).toContain("Размер: 44");
    expect(html).toContain("Цвет: Blue &amp; white");
    expect(html).toContain("<blockquote expandable>");
    expect(html).toContain(`<code>${order.number}</code>`);
    expect(html).toContain(order.items[0]!.productId);
    expect(html).toContain(order.items[0]!.variantId);
    expect(html).toContain(order.items[0]!.variant);
    expect(html).toContain(order.createdAt);
    expect(html).toContain("9 окт. 2026");
    expect(html).toContain("08:30");
    expect(html).toContain("Заявка без оплаты и резерва");
    expect(html).toContain("Покупатель подтвердил передачу данных");
  });
  it("omits empty comment blocks but preserves an explicit missing email", async () => {
    const order = await resolveOrderRequest(await fixture(), commerce);
    order.customer.comment = "";
    order.customer.email = "";
    expect(telegramRequestHtml(order)).not.toContain("Комментарий покупателя");
    expect(telegramRequestHtml(order)).toContain("Email: —");
  });
  it("sends oversized complete requests as one text attachment, without truncating contacts or lines", async () => {
    configure();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ ok: true, result: { message_id: 13 } }),
      );
    vi.stubGlobal("fetch", fetcher);
    const order = await resolveOrderRequest(await fixture(), commerce);
    order.items = Array.from({ length: 20 }, () => ({
      ...order.items[0]!,
      name: "Тестовая модель ".repeat(25),
    }));
    await sendOrderToTelegram(order);
    expect(fetcher.mock.calls[0]?.[0]).toContain("/sendDocument");
    const body = fetcher.mock.calls[0]?.[1]?.body as FormData;
    expect(await (body.get("document") as File).text()).toBe(
      telegramRequestText(order),
    );
    expect(body.has("parse_mode")).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("accounts for HTML escaping in the message budget and keeps the attachment unescaped", async () => {
    configure();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ ok: true, result: { message_id: 14 } }),
      );
    vi.stubGlobal("fetch", fetcher);
    const order = await resolveOrderRequest(await fixture(), commerce);
    order.customer.comment = "<>&".repeat(300);
    expect(telegramRequestText(order).length).toBeLessThan(4000);
    expect(telegramRequestHtml(order).length).toBeGreaterThan(4000);
    await sendOrderToTelegram(order);
    expect(fetcher.mock.calls[0]?.[0]).toContain("/sendDocument");
    const body = fetcher.mock.calls[0]?.[1]?.body as FormData;
    const attachment = await (body.get("document") as File).text();
    expect(attachment).toBe(telegramRequestText(order));
    expect(attachment).toContain(order.customer.comment);
  });
  it("distinguishes explicit rejection from ambiguous timeout and never exposes token errors", async () => {
    configure();
    const order = await resolveOrderRequest(await fixture(), commerce);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ok: false }, { status: 429 })),
    );
    await expect(sendOrderToTelegram(order)).rejects.toBeInstanceOf(
      TelegramRejectedError,
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("token-bearing URL must not escape");
      }),
    );
    await expect(sendOrderToTelegram(order)).rejects.toBeInstanceOf(
      DeliveryUncertainError,
    );
    await expect(sendOrderToTelegram(order)).rejects.not.toThrow(
      "token-bearing",
    );
  });
  it("rejects an unconfirmed or malformed successful response", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ok: true, result: {} })),
    );
    await expect(
      sendOrderToTelegram(await resolveOrderRequest(await fixture(), commerce)),
    ).rejects.toBeInstanceOf(DeliveryUncertainError);
  });
});

describe("bounded request service", () => {
  it("fails closed without configuration", async () => {
    const send = vi.fn();
    const service = new CheckoutService({
      provider: commerce,
      ready: () => false,
      send,
    });
    expect((await service.submit(await fixture())).body).toEqual({
      ok: false,
      code: "not_configured",
    });
    expect(send).not.toHaveBeenCalled();
  });
  it("coalesces concurrent clicks and returns the same receipt on retry", async () => {
    const send = vi.fn(async () => {});
    const service = new CheckoutService({
      provider: commerce,
      ready: () => true,
      send,
    });
    const input = await fixture();
    const receipts = await Promise.all([
      service.submit(input),
      service.submit(input),
      service.submit(input),
    ]);
    expect(receipts.every((item) => item.body.ok)).toBe(true);
    expect(receipts[0]).toEqual(receipts[1]);
    await service.submit(input);
    expect(send).toHaveBeenCalledTimes(1);
    expect(
      (
        await service.submit({
          ...input,
          customer: { ...input.customer, name: "Другое имя" },
        })
      ).status,
    ).toBe(409);
  });
  it("retains an ambiguous result and never silently re-sends it", async () => {
    const send = vi.fn(async () => {
      throw new DeliveryUncertainError();
    });
    const service = new CheckoutService({
      provider: commerce,
      ready: () => true,
      send,
    });
    const input = await fixture();
    expect((await service.submit(input)).body).toMatchObject({
      ok: false,
      code: "delivery_uncertain",
    });
    await service.submit(input);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("allows retry after an explicit rejection, but bounds new requests per phone", async () => {
    let now = 1000;
    const send = vi.fn(async () => {
      throw new TelegramRejectedError();
    });
    const service = new CheckoutService({
      provider: commerce,
      ready: () => true,
      send,
      now: () => now,
    });
    const input = await fixture();
    for (let i = 0; i < 3; i++)
      expect((await service.submit(input)).status).toBe(502);
    expect((await service.submit(input)).status).toBe(429);
    now += 600_001;
    expect((await service.submit(input)).status).toBe(502);
  });
});
