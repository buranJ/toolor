import { commerce } from "@/lib/commerce";
import { siteConfig } from "@/lib/config/site";
import { checkoutRequestSchema } from "@/features/checkout/schema";
import { CheckoutService } from "@/features/checkout/service";
import { orderRepository } from "@/features/orders/netlify-store";
import {
  sendOrderToTelegram,
  telegramConfig,
} from "@/features/checkout/telegram";

export const runtime = "nodejs";
const service = new CheckoutService({
  provider: commerce,
  send: sendOrderToTelegram,
  repository: orderRepository,
  ready: () => {
    try {
      telegramConfig();
      return true;
    } catch {
      return false;
    }
  },
});
const headers = { "Cache-Control": "no-store" };
const error = (code: string, status: number) =>
  Response.json({ ok: false, code }, { status, headers });

/** Limit the actual body, not just the attacker-controlled Content-Length. */
async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("empty");
  const chunks: Uint8Array[] = [];
  let size = 0;
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    void reader.cancel();
  }, 5000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (expired) throw new Error("timeout");
      if (done) break;
      size += value.byteLength;
      if (size > 32_768) {
        await reader.cancel();
        throw new Error("large");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    ) as unknown;
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  if (
    ![siteConfig.url, new URL(request.url).origin].includes(
      request.headers.get("origin") ?? "",
    ) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return error("forbidden", 403);
  if (
    request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !==
    "application/json"
  )
    return error("invalid_content_type", 415);
  let raw: unknown;
  try {
    raw = await readBody(request);
  } catch (cause) {
    return error(
      "invalid_body",
      cause instanceof Error && cause.message === "large" ? 413 : 400,
    );
  }
  const parsed = checkoutRequestSchema.safeParse(raw);
  if (!parsed.success) return error("invalid_request", 400);
  const result = await service.submit(parsed.data);
  return Response.json(result.body, {
    status: result.status,
    headers: {
      ...headers,
      ...(result.status === 429 ? { "Retry-After": "600" } : {}),
    },
  });
}
