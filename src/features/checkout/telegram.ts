import { z } from "zod";

import { getDictionary, localePath } from "@/i18n";
import { siteConfig } from "@/lib/config/site";
import { formatMoney } from "@/lib/utils/money";
import type { OrderRequest } from "./order-request";
import { getDictionary as dictionary } from "@/i18n";
import { orderButtons } from "@/features/orders/presentation";
import type { StoredOrder } from "@/features/orders/repository";

export class TelegramUnavailableError extends Error {}
export class DeliveryUncertainError extends Error {}
export class TelegramRejectedError extends Error {}

export function telegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  const topic = process.env.TELEGRAM_MESSAGE_THREAD_ID?.trim();
  // Only an explicitly configured numeric recipient; never a client parameter.
  if (
    !token ||
    !/^\d+:[A-Za-z0-9_-]+$/.test(token) ||
    !chatId ||
    !/^-?\d+$/.test(chatId) ||
    (topic &&
      (!/^\d+$/.test(topic) ||
        Number(topic) < 1 ||
        !Number.isSafeInteger(Number(topic))))
  ) {
    throw new TelegramUnavailableError();
  }
  return { token, chatId, threadId: topic ? Number(topic) : undefined };
}

/** Staff notifications deliberately use Russian; catalogue data is untranslated. */
export function telegramRequestText(order: OrderRequest) {
  const copy = getDictionary("ru").checkout;
  const t = copy.telegram;
  const money = (amount: number) =>
    formatMoney({ amount, currencyCode: "KGS" }, "ru");
  const delivery = {
    bishkek: copy.deliveryOptions.bishkekTitle,
    regions: copy.deliveryOptions.regionsTitle,
    international: copy.deliveryOptions.internationalTitle,
  };
  return [
    `${t.title} ${order.number}`,
    `${t.createdAt}: ${order.createdAt}`,
    `${t.locale}: ${order.locale}`,
    "",
    `${t.name}: ${order.customer.name}`,
    `${t.phone}: ${order.customer.phone}`,
    `${t.email}: ${order.customer.email || "—"}`,
    `${copy.delivery}: ${delivery[order.delivery]}`,
    `${t.city}: ${order.customer.city}`,
    `${t.address}: ${order.customer.address}`,
    `${copy.comment}:\n${order.customer.comment || "—"}`,
    "",
    t.items,
    ...order.items.map((item, index) =>
      [
        `${index + 1}. ${item.name}`,
        `${t.variant}: ${item.variant || "—"}`,
        ...Object.entries(item.options).map(
          ([key, value]) => `${key}: ${value}`,
        ),
        `${t.sku}: ${item.sku}`,
        `${t.identifiers}: ${item.productId} / ${item.variantId}`,
        `${t.quantity}: ${item.quantity} × ${money(item.unitAmount)} = ${money(item.unitAmount * item.quantity)}`,
        `${siteConfig.url}${localePath(order.locale, `/product/${item.slug}`)}`,
        "",
      ].join("\n"),
    ),
    `${t.subtotal}: ${money(order.subtotal)}`,
    copy.deliveryNote,
    copy.paymentNote,
    t.pending,
    t.consent,
  ].join("\n");
}

const replySchema = z.object({
  ok: z.literal(true),
  result: z.object({ message_id: z.number().int().positive() }),
});

/** Escape every dynamic value, including catalogue strings and link attributes.
 * Only this renderer can add Telegram HTML; buyers cannot inject entities. */
export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function telegramRequestHtml(order: OrderRequest) {
  const copy = getDictionary("ru").checkout;
  const t = copy.telegram;
  const bold = (value: string) => `<b>${escapeHtml(value)}</b>`;
  const field = (label: string, value: string) =>
    `${escapeHtml(label)}: ${escapeHtml(value || "—")}`;
  const money = (amount: number) =>
    formatMoney({ amount, currencyCode: "KGS" }, "ru");
  const delivery = {
    bishkek: copy.deliveryOptions.bishkekTitle,
    regions: copy.deliveryOptions.regionsTitle,
    international: copy.deliveryOptions.internationalTitle,
  };
  const date = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(order.createdAt));
  return [
    `🛍 ${bold(t.title)}`,
    field(t.createdAt, date),
    field(t.locale, order.locale.toUpperCase()),
    "",
    `👤 ${bold(t.contacts)}`,
    bold(order.customer.name),
    field(t.phone, order.customer.phone),
    field(t.email, order.customer.email),
    "",
    `📍 ${bold(t.deliveryHeading)}`,
    escapeHtml(delivery[order.delivery]),
    field(t.city, order.customer.city),
    field(t.address, order.customer.address),
    ...(order.customer.comment
      ? [
          "",
          `💬 ${bold(t.commentHeading)}`,
          `<blockquote>${escapeHtml(order.customer.comment)}</blockquote>`,
        ]
      : []),
    "",
    `📦 ${bold(t.items)}`,
    ...order.items.flatMap((item, index) => {
      const options = Object.entries(item.options);
      const url = `${siteConfig.url}${localePath(order.locale, `/product/${item.slug}`)}`;
      return [
        bold(`${index + 1}. ${item.name}`),
        ...(options.length
          ? options.map(([key, value]) =>
              field(
                key === "size" ? t.size : key === "color" ? t.color : key,
                value,
              ),
            )
          : [field(t.variant, item.variant)]),
        field(t.sku, item.sku),
        `${item.quantity} × ${escapeHtml(money(item.unitAmount))} = ${bold(money(item.quantity * item.unitAmount))}`,
        `<a href="${escapeHtml(url)}">${escapeHtml(t.openProduct)}</a>`,
        "",
      ];
    }),
    `💰 ${bold(`${t.subtotal}: ${money(order.subtotal)}`)}`,
    `<i>${escapeHtml(t.deliveryPending)}</i>`,
    "",
    `<i>${escapeHtml(t.notice)}</i>`,
    "",
    // Keep full unique IDs and consent available, without crowding the main card.
    `<blockquote expandable>${[
      bold(t.details),
      `${escapeHtml(t.reference)}: <code>${escapeHtml(order.number)}</code>`,
      field(t.createdAt, order.createdAt),
      ...order.items.flatMap((item, index) => [
        `${index + 1}. ${escapeHtml(item.name)}`,
        field(t.variant, item.variant),
        field(t.identifiers, `${item.productId} / ${item.variantId}`),
      ]),
      escapeHtml(t.consent),
    ].join("\n")}</blockquote>`,
  ].join("\n");
}

/** No automatic retries: a timeout can occur after Telegram accepted a message. */
export type TelegramReceipt = { messageId: number; asFile: boolean };
export function workflowHtml(record: StoredOrder) {
  const t = dictionary("ru").checkout.orderBot;
  return [
    `<b>${escapeHtml(t.status)}: ${escapeHtml(t.statuses[record.status])}</b>`,
    ...(record.assignedTo
      ? [
          `${escapeHtml(t.assigned)}: <code>${escapeHtml(record.assignedTo)}</code>`,
        ]
      : []),
    ...(record.delivery === "uncertain" || record.delivery === "dispatching"
      ? [`<i>${escapeHtml(t.deliveryUncertain)}</i>`]
      : []),
    "",
    `<blockquote expandable><b>${escapeHtml(t.audit)}</b>\n${record.history.map((event) => `${escapeHtml(event.at)} · ${escapeHtml(t.statuses[event.status])}${event.actor ? ` · ${escapeHtml(event.actor)}` : ""}`).join("\n")}</blockquote>`,
  ].join("\n");
}
export function orderCardHtml(record: StoredOrder) {
  return `${telegramRequestHtml(record.order)}\n\n${workflowHtml(record)}`;
}
export function orderCaption(record: StoredOrder) {
  const t = dictionary("ru").checkout.orderBot;
  return `${dictionary("ru").checkout.telegram.title}\n${record.order.number}\n${t.status}: ${t.statuses[record.status]}`;
}
export async function sendOrderToTelegram(
  order: OrderRequest,
  record?: StoredOrder,
): Promise<TelegramReceipt> {
  const { chatId, threadId } = telegramConfig();
  const text = telegramRequestText(order);
  const managed =
    Boolean(record) || process.env.ORDER_STORAGE_DRIVER === "netlify";
  const html = record
    ? orderCardHtml(record)
    : `${telegramRequestHtml(order)}${managed ? `\n\n<b>${getDictionary("ru").checkout.orderBot.status}: ${getDictionary("ru").checkout.orderBot.statuses.new}</b>` : ""}`;
  // Conservative UTF-16/source budget includes markup and escaped characters;
  // it is below Telegram's parsed-message limit, even for emoji-heavy inputs.
  const asFile = text.length > 4000 || html.length > (managed ? 3000 : 4000);
  const params = {
    chat_id: chatId,
    ...(threadId ? { message_thread_id: threadId } : {}),
    ...(managed
      ? {
          reply_markup: orderButtons(
            order.requestId,
            record?.workflowRevision ?? 1,
            record?.status ?? "new",
          ),
        }
      : {}),
  };
  let body: string | FormData;
  if (asFile) {
    const data = new FormData();
    for (const [key, value] of Object.entries(params))
      data.set(
        key,
        typeof value === "object" ? JSON.stringify(value) : String(value),
      );
    data.set(
      "caption",
      record
        ? orderCaption(record)
        : `${getDictionary("ru").checkout.telegram.title} ${order.number}`,
    );
    data.set(
      "document",
      new Blob(
        [
          record
            ? `${text}\n\n${getDictionary("ru").checkout.orderBot.status}: ${getDictionary("ru").checkout.orderBot.statuses[record.status]}\n${record.history.map((event) => `${event.at}: ${event.status}${event.actor ? ` (${event.actor})` : ""}`).join("\n")}`
            : text,
        ],
        { type: "text/plain;charset=utf-8" },
      ),
      `${order.number}.txt`,
    );
    body = data;
  } else {
    body = JSON.stringify({
      ...params,
      text: html,
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
  }
  const result = await telegramApi(
    asFile ? "sendDocument" : "sendMessage",
    body,
  );
  const message = replySchema.safeParse({ ok: true, result });
  if (!message.success) throw new DeliveryUncertainError();
  return { messageId: message.data.result.message_id, asFile };
}

/** Sanitized transport shared with the private staff bot. */
export async function telegramApi(
  method: string,
  body: object | string | FormData,
): Promise<unknown> {
  const { token } = telegramConfig();
  const multipart = body instanceof FormData;
  let response: Response;
  let result: unknown;
  try {
    response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: multipart ? undefined : { "Content-Type": "application/json" },
      body: multipart || typeof body === "string" ? body : JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
    });
    result = await response.json();
  } catch {
    // Do not propagate fetch errors: they can contain the token-bearing URL.
    throw new DeliveryUncertainError();
  }
  const rejected = z
    .object({ ok: z.literal(false), description: z.string().optional() })
    .safeParse(result);
  if (rejected.success) {
    if (
      method.startsWith("editMessage") &&
      rejected.data.description?.includes("message is not modified")
    )
      return true;
    throw new TelegramRejectedError();
  }
  const reply = z
    .object({ ok: z.literal(true), result: z.unknown() })
    .safeParse(result);
  if (!response.ok || !reply.success) throw new DeliveryUncertainError();
  return reply.data.result;
}
