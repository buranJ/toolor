import { createHash, timingSafeEqual } from "node:crypto";
import { telegramConfig } from "@/features/checkout/telegram";
import { OrderBot, telegramUpdateSchema } from "@/features/orders/bot";
import { orderRepository } from "@/features/orders/netlify-store";
import { telegramOperatorIds } from "@/features/orders/operators";

export const runtime = "nodejs";
const reply = (status: number) =>
  Response.json(
    { ok: status === 200 },
    { status, headers: { "Cache-Control": "no-store" } },
  );
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret || !/^[A-Za-z0-9_-]{32,256}$/.test(secret)) return reply(503);
  const supplied = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (
    supplied.length > 256 ||
    !timingSafeEqual(
      createHash("sha256").update(supplied).digest(),
      createHash("sha256").update(secret).digest(),
    )
  )
    return reply(403);
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return reply(415);
  const reader = request.body?.getReader();
  if (!reader) return reply(400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    void reader.cancel();
  }, 5000);
  let raw: unknown;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (expired) return reply(408);
      if (done) break;
      length += value.byteLength;
      if (length > 65_536) {
        await reader.cancel();
        return reply(413);
      }
      chunks.push(value);
    }
    raw = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    return reply(400);
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
  const parsed = telegramUpdateSchema.safeParse(raw);
  if (!parsed.success) return reply(400);
  try {
    const { chatId } = telegramConfig();
    const operators = telegramOperatorIds(chatId);
    const callback = parsed.data.callback_query;
    const message = callback?.message ?? parsed.data.message;
    const actor = callback?.from ?? parsed.data.message?.from;
    // Private chat must belong to the actor himself. Authorize before opening
    // storage; membership of a group or spoofed forwarded sender grants nothing.
    if (
      !message ||
      !actor ||
      message.chat.type !== "private" ||
      String(message.chat.id) !== String(actor.id) ||
      !operators.includes(String(actor.id))
    )
      return reply(200);
    const operatorId = String(actor.id);
    const repository = orderRepository();
    if (!repository) return reply(503);
    await new OrderBot({
      repository,
      operatorId,
      chatId: operatorId,
      notificationChatId: chatId,
    }).handle(parsed.data);
    return reply(200);
  } catch {
    // No secrets, webhook payloads, buyer data or raw SDK errors in logs/replies.
    // Telegram may retry; atomic workflow revisions prevent double transitions.
    return reply(503);
  }
}
