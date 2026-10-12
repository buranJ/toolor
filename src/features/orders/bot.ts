import { z } from "zod";
import { getDictionary } from "@/i18n";
import { formatMoney } from "@/lib/utils/money";
import {
  escapeHtml,
  orderCardHtml,
  orderCaption,
  sendOrderToTelegram,
  telegramApi,
} from "@/features/checkout/telegram";
import {
  cancelButtons,
  menuButtons,
  orderButtons,
  type InlineKeyboard,
} from "./presentation";
import {
  type OrderRepository,
  type OrderStatus,
  type StoredOrder,
  statusSchema,
} from "./repository";

const user = z.object({ id: z.number().int() });
const chat = z.object({ id: z.number().int(), type: z.string() });
export const telegramUpdateSchema = z.object({
  update_id: z.number().int().nonnegative(),
  message: z
    .object({
      message_id: z.number().int(),
      from: user.optional(),
      chat,
      text: z.string().max(4096).optional(),
    })
    .optional(),
  callback_query: z
    .object({
      id: z.string().max(200),
      from: user,
      data: z.string().max(64).optional(),
      message: z
        .object({
          message_id: z.number().int(),
          chat,
          document: z.unknown().optional(),
        })
        .optional(),
    })
    .optional(),
});
export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;
const t = () => getDictionary("ru").checkout.orderBot;

export class OrderBot {
  constructor(
    private readonly dependencies: {
      repository: OrderRepository;
      operatorId: string;
      chatId: string;
      api?: typeof telegramApi;
      sendOrder?: typeof sendOrderToTelegram;
    },
  ) {}
  private api(method: string, data: object) {
    return (this.dependencies.api ?? telegramApi)(method, data);
  }
  private send(text: string, reply_markup: InlineKeyboard) {
    return this.api("sendMessage", {
      chat_id: this.dependencies.chatId,
      text,
      parse_mode: "HTML",
      reply_markup,
      link_preview_options: { is_disabled: true },
    });
  }
  private async show(
    record: StoredOrder,
    message?: { id: number; file: boolean },
  ) {
    if (!message) {
      await (this.dependencies.sendOrder ?? sendOrderToTelegram)(
        record.order,
        record,
      );
      return;
    }
    const reply_markup = orderButtons(
      record.order.requestId,
      record.workflowRevision,
      record.status,
    );
    const html = orderCardHtml(record);
    if (!message.file && html.length > 4000) {
      // Preserve a large existing card as-is and deliver the complete updated
      // record as a file, rather than silently truncating buyer/order data.
      await (this.dependencies.sendOrder ?? sendOrderToTelegram)(
        record.order,
        record,
      );
      return;
    }
    await this.api(message.file ? "editMessageCaption" : "editMessageText", {
      chat_id: this.dependencies.chatId,
      message_id: message.id,
      reply_markup,
      ...(message.file
        ? { caption: orderCaption(record) }
        : {
            text: html,
            parse_mode: "HTML",
            link_preview_options: { is_disabled: true },
          }),
    });
  }
  private async menu() {
    await this.send(
      `<b>${escapeHtml(t().title)}</b>\n\n${escapeHtml(t().help)}`,
      menuButtons(),
    );
  }
  private async list(status: OrderStatus | "all", offset: number) {
    const copy = t();
    const result = await this.dependencies.repository.list(status, offset);
    const label = status === "all" ? copy.all : copy.statuses[status];
    const rows: InlineKeyboard["inline_keyboard"] = result.items.map(
      (record) => [
        {
          text: `${record.order.number.slice(4, 12)} · ${Array.from(record.order.customer.name).slice(0, 24).join("")} · ${copy.statuses[record.status]}`,
          callback_data: `v:${record.order.requestId}`,
        },
      ],
    );
    if (result.nextOffset !== null)
      rows.push([
        { text: copy.next, callback_data: `l:${status}:${result.nextOffset}` },
      ]);
    rows.push([
      { text: copy.refresh, callback_data: `l:${status}:0` },
      { text: copy.menu, callback_data: "menu" },
    ]);
    const lines = result.items.map(
      (record) =>
        `${escapeHtml(record.order.number.slice(4, 12))} · ${escapeHtml(Array.from(record.order.customer.name).slice(0, 40).join(""))}\n${escapeHtml(copy.statuses[record.status])} · ${escapeHtml(formatMoney({ amount: record.order.subtotal, currencyCode: "KGS" }, "ru"))}`,
    );
    await this.send(
      `<b>${escapeHtml(copy.history)} · ${escapeHtml(label)}</b>\n\n${lines.length ? lines.join("\n\n") : escapeHtml(copy.empty)}`,
      { inline_keyboard: rows },
    );
  }
  async handle(update: TelegramUpdate): Promise<void> {
    const callback = update.callback_query;
    const message = callback?.message ?? update.message;
    const actor = callback?.from ?? update.message?.from;
    if (
      !message ||
      !actor ||
      message.chat.type !== "private" ||
      String(message.chat.id) !== this.dependencies.chatId ||
      String(actor.id) !== this.dependencies.operatorId
    ) {
      if (callback) {
        try {
          await this.api("answerCallbackQuery", {
            callback_query_id: callback.id,
            text: t().denied,
          });
        } catch {
          // An expired callback must not turn an unauthorized update into a
          // retry loop. No customer data is read or returned here.
        }
      }
      return;
    }
    if (!callback) {
      const command = update.message?.text
        ?.trim()
        .split(/\s+/)[0]
        ?.split("@")[0];
      if (["/orders", "/history"].includes(command ?? ""))
        await this.list("all", 0);
      else if (command === "/new") await this.list("new", 0);
      else await this.menu();
      return;
    }
    const data = callback.data ?? "";
    // Answer immediately so Telegram stops its loading spinner. The subsequent
    // state write is guarded by a separate workflow revision and storage ETag.
    try {
      await this.api("answerCallbackQuery", { callback_query_id: callback.id });
    } catch {
      // Telegram can redeliver an already answered/expired query. Its optional
      // spinner acknowledgement must not block the durable, idempotent action.
    }
    if (data === "menu") {
      await this.menu();
      return;
    }
    const list =
      /^l:(all|new|working|shipped|completed|cancelled):(\d{1,8})$/.exec(data);
    if (list) {
      await this.list(list[1] as OrderStatus | "all", Number(list[2]));
      return;
    }
    const view = /^v:([a-f0-9-]{36})$/.exec(data);
    if (view && z.uuid().safeParse(view[1]).success) {
      const record = (await this.dependencies.repository.get(view[1]!))?.record;
      if (record) await this.show(record);
      else await this.send(escapeHtml(t().missing), menuButtons());
      return;
    }
    const action =
      /^o:([a-f0-9-]{36}):(\d{1,6}):(take|ship|done|ask|cancel)$/.exec(data);
    if (!action || !z.uuid().safeParse(action[1]).success) return;
    const id = action[1]!;
    const entry = await this.dependencies.repository.get(id);
    if (!entry) {
      await this.send(escapeHtml(t().missing), menuButtons());
      return;
    }
    if (action[3] === "ask") {
      if (
        Number(action[2]) !== entry.record.workflowRevision ||
        !["new", "working"].includes(entry.record.status)
      ) {
        await this.show(entry.record, {
          id: message.message_id,
          file: callback.message?.document !== undefined,
        });
        return;
      }
      await this.send(
        `${escapeHtml(t().cancelQuestion)}\n<code>${escapeHtml(entry.record.order.number)}</code>`,
        cancelButtons(entry.record),
      );
      return;
    }
    const status = statusSchema.parse(
      {
        take: "working",
        ship: "shipped",
        done: "completed",
        cancel: "cancelled",
      }[action[3] as "take" | "ship" | "done" | "cancel"],
    );
    const result = await this.dependencies.repository.transition(
      id,
      Number(action[2]),
      status,
      this.dependencies.operatorId,
      callback.id,
    );
    if (result.kind === "missing") return;
    // Cancellation confirmation is a separate message; don't replace it with
    // a long order card. Update the original notification when we have its ID.
    const target =
      action[3] === "cancel"
        ? result.record.messageId
          ? { id: result.record.messageId, file: result.record.asFile ?? false }
          : undefined
        : {
            id: message.message_id,
            file: callback.message?.document !== undefined,
          };
    await this.show(result.record, target);
    if (action[3] === "cancel")
      await this.api("editMessageText", {
        chat_id: this.dependencies.chatId,
        message_id: message.message_id,
        text: `${t().status}: ${t().statuses[result.record.status]}\n${result.record.order.number}`,
        reply_markup: {
          inline_keyboard: [[{ text: t().history, callback_data: "l:all:0" }]],
        },
      });
  }
}
