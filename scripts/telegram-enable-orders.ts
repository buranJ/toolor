/** Explicit setup command, not a build hook. Secrets never appear in output. */
import { z } from "zod";
import { getDictionary } from "../src/i18n";
try {
  process.loadEnvFile(".env.local");
} catch {
  /* Hosting may provide env. */
}
const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const origin =
  process.env.TELEGRAM_WEBHOOK_ORIGIN?.trim() || "https://toolor.store";
async function api(method: string, payload: object = {}) {
  if (!token || !/^\d+:[A-Za-z0-9_-]+$/.test(token))
    throw new Error("Configure bot token privately");
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
        redirect: "error",
      },
    );
    const reply = z
      .object({ ok: z.literal(true), result: z.unknown() })
      .safeParse(await response.json());
    if (!response.ok || !reply.success) throw new Error();
    return reply.data.result;
  } catch {
    throw new Error(
      "Telegram setup failed. Check credentials/connectivity. Secret values hidden.",
    );
  }
}
async function main() {
  if (!secret || !/^[A-Za-z0-9_-]{32,256}$/.test(secret))
    throw new Error("Configure TELEGRAM_WEBHOOK_SECRET privately");
  if (!/^https:\/\/[^/?#]+$/.test(origin))
    throw new Error("Use an HTTPS origin without paths");
  const url = `${origin}/api/telegram/webhook`;
  const current = z
    .object({ url: z.string() })
    .parse(await api("getWebhookInfo"));
  if (current.url && current.url !== url)
    throw new Error(
      "A different webhook is active. Nothing changed; coordinate with its owner.",
    );
  const me = z.object({ username: z.string() }).parse(await api("getMe"));
  console.log(`Bot: @${me.username}`);
  const commands = getDictionary("ru").checkout.orderBot;
  await api("setMyCommands", {
    commands: [
      { command: "start", description: commands.title },
      { command: "orders", description: commands.history },
      { command: "new", description: commands.statuses.new },
    ],
  });
  await api("setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    max_connections: 1,
    drop_pending_updates: false,
  });
  const info = z
    .object({ url: z.string(), pending_update_count: z.number() })
    .parse(await api("getWebhookInfo"));
  if (info.url !== url) throw new Error("Webhook verification failed");
  console.log(
    "Webhook enabled and verified. Pending updates:",
    info.pending_update_count,
  );
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Setup failed");
  process.exitCode = 1;
});
