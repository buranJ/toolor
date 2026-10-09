/** Read-only discovery. No customer data is sent; no webhook or offset changes.
 * Never paste tokens into CLI arguments or browser URLs. */
import { z } from "zod";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* Hosting may supply env. */
}

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const chatSchema = z.object({ id: z.number().int(), type: z.string() });

async function telegram(method: string, data: object = {}) {
  if (!token || !/^\d+:[A-Za-z0-9_-]+$/.test(token))
    throw new Error(
      "Добавьте TELEGRAM_BOT_TOKEN в .env.local. Не отправляйте токен в чат.",
    );
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      },
    );
    const reply = z
      .object({ ok: z.boolean(), result: z.unknown().optional() })
      .parse(await response.json());
    if (!response.ok || !reply.ok) throw new Error();
    return reply.result;
  } catch {
    throw new Error(
      "Telegram не ответил успешно. Проверьте токен и интернет. Токен скрыт.",
    );
  }
}

async function main() {
  const me = z.object({ username: z.string() }).parse(await telegram("getMe"));
  console.log(`Бот: @${me.username}`);
  const webhook = z
    .object({ url: z.string() })
    .parse(await telegram("getWebhookInfo"));
  if (webhook.url) {
    console.log(
      "У бота настроен webhook. Ничего не изменено. Лучше создать отдельного бота, чтобы не нарушить другую интеграцию.",
    );
    return;
  }
  const updates = z
    .array(
      z.object({
        message: z.object({ chat: chatSchema }).optional(),
        my_chat_member: z.object({ chat: chatSchema }).optional(),
      }),
    )
    .parse(await telegram("getUpdates", { timeout: 0 }));
  const chats = new Map<number, string>();
  for (const update of updates) {
    const chat = update.message?.chat ?? update.my_chat_member?.chat;
    if (chat) chats.set(chat.id, chat.type);
  }
  if (!chats.size)
    console.log(
      "Откройте бота и нажмите Start. Для группы добавьте бота в закрытую группу и отправьте /start@имя_бота. Затем повторите команду.",
    );
  for (const [id, type] of chats)
    console.log(`${type}: TELEGRAM_CHAT_ID=${id}`);
  console.log(
    "Выберите нужный чат и сохраните TELEGRAM_CHAT_ID в .env.local. Команда не отправляла сообщений и не выводила переписку.",
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Не удалось проверить бота.",
  );
  process.exitCode = 1;
});
