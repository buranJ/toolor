// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { handle, repository } = vi.hoisted(() => ({
  handle: vi.fn(async () => {}),
  repository: vi.fn(() => ({})),
}));
vi.mock("@/features/orders/netlify-store", () => ({
  orderRepository: repository,
}));
vi.mock("@/features/orders/bot", async (original) => {
  const actual = await original<typeof import("@/features/orders/bot")>();
  return {
    ...actual,
    OrderBot: class {
      handle = handle;
    },
  };
});
vi.mock("@/features/checkout/telegram", () => ({
  telegramConfig: () => ({ chatId: "123" }),
}));
import { POST } from "./route";
const secret = "synthetic_webhook_secret_0123456789";
function request(
  body = JSON.stringify({ update_id: 1 }),
  supplied = secret,
  contentType = "application/json",
) {
  return new Request("https://toolor.store/api/telegram/webhook", {
    method: "POST",
    body,
    headers: {
      "x-telegram-bot-api-secret-token": supplied,
      "content-type": contentType,
    },
  });
}
beforeEach(() => {
  vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", secret);
  vi.stubEnv("TELEGRAM_OPERATOR_ID", "123");
  vi.clearAllMocks();
});
afterEach(() => {
  vi.unstubAllEnvs();
});
describe("authenticated Telegram webhook", () => {
  it("fails closed without a secret and rejects spoofed/oversized secrets before reading orders", async () => {
    expect((await POST(request("{}", "wrong"))).status).toBe(403);
    expect((await POST(request("{}", "x".repeat(257)))).status).toBe(403);
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "");
    expect((await POST(request())).status).toBe(503);
    expect(repository).not.toHaveBeenCalled();
    expect(handle).not.toHaveBeenCalled();
  });
  it("bounds the actual body and validates content type/update shape", async () => {
    expect((await POST(request("{}", secret, "text/plain"))).status).toBe(415);
    expect((await POST(request("x".repeat(65537)))).status).toBe(413);
    expect((await POST(request("{"))).status).toBe(400);
    expect((await POST(request("{}"))).status).toBe(400);
  });
  it("rejects a missing/mismatched private operator configuration", async () => {
    vi.stubEnv("TELEGRAM_OPERATOR_ID", "456");
    expect((await POST(request())).status).toBe(503);
    expect(handle).not.toHaveBeenCalled();
  });
  it("accepts trusted updates without returning any secret or buyer data", async () => {
    const reply = await POST(request());
    expect(reply.status).toBe(200);
    expect(handle).toHaveBeenCalledTimes(1);
    expect(reply.headers.get("cache-control")).toBe("no-store");
    expect(await reply.text()).toBe('{"ok":true}');
  });
  it("returns a generic retryable response on handler failure", async () => {
    handle.mockRejectedValueOnce(new Error("private credential/customer data"));
    const reply = await POST(request());
    expect(reply.status).toBe(503);
    expect(await reply.text()).not.toContain("private");
  });
});
