import { getDictionary } from "@/i18n";
import type { StoredOrder, OrderStatus } from "./repository";
export type InlineKeyboard = {
  inline_keyboard: { text: string; callback_data: string }[][];
};
const t = () => getDictionary("ru").checkout.orderBot;
export function orderButtons(
  id: string,
  revision: number,
  status: OrderStatus,
): InlineKeyboard {
  const copy = t();
  const button = (text: string, action: string) => ({
    text,
    callback_data: `o:${id}:${revision}:${action}`,
  });
  const rows =
    status === "new"
      ? [[button(copy.take, "take")]]
      : status === "working"
        ? [[button(copy.ship, "ship")]]
        : status === "shipped"
          ? [[button(copy.complete, "done")]]
          : [];
  if (status === "new" || status === "working")
    rows.push([button(copy.cancel, "ask")]);
  rows.push([
    { text: copy.history, callback_data: "l:all:0" },
    { text: copy.menu, callback_data: "menu" },
  ]);
  return { inline_keyboard: rows };
}
export function menuButtons(): InlineKeyboard {
  const copy = t();
  const b = (status: OrderStatus | "all") => ({
    text: status === "all" ? copy.all : copy.statuses[status],
    callback_data: `l:${status}:0`,
  });
  return {
    inline_keyboard: [
      [b("new"), b("working")],
      [b("shipped"), b("completed")],
      [b("cancelled"), b("all")],
    ],
  };
}
export function cancelButtons(record: StoredOrder): InlineKeyboard {
  const copy = t();
  return {
    inline_keyboard: [
      [
        {
          text: copy.confirmCancel,
          callback_data: `o:${record.order.requestId}:${record.workflowRevision}:cancel`,
        },
        { text: copy.keep, callback_data: `v:${record.order.requestId}` },
      ],
    ],
  };
}
