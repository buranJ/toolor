// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

// Never allow a test to contact Telegram, even if the developer configured env.
vi.mock("@/features/checkout/telegram", () => ({
  sendOrderToTelegram: vi.fn(),
  telegramConfig: () => {
    throw new Error("not configured in route tests");
  },
}));
import { POST } from "./route";
afterEach(() => vi.unstubAllEnvs());

function request(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3100/api/order-requests", {
    method: "POST",
    body,
    headers: {
      origin: "http://localhost:3100",
      "content-type": "application/json",
      ...headers,
    },
  });
}

describe("public request endpoint", () => {
  it("pauses new requests during migration without parsing customer input", async () => {
    vi.stubEnv("ORDER_MAINTENANCE", "1");
    const response = await POST(request("invalid body"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, code: "unavailable" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects cross-origin and missing-origin submissions", async () => {
    expect(
      (await POST(request("{}", { origin: "https://evil.example" }))).status,
    ).toBe(403);
    expect((await POST(request("{}", { origin: "" }))).status).toBe(403);
  });
  it("rejects form posts, oversized bodies, malformed JSON and empty carts", async () => {
    expect(
      (await POST(request("{}", { "content-type": "text/plain" }))).status,
    ).toBe(415);
    expect((await POST(request("x".repeat(32_769)))).status).toBe(413);
    expect((await POST(request("{"))).status).toBe(400);
    expect((await POST(request("{}"))).status).toBe(400);
  });
  it("never caches an error response or returns field values", async () => {
    const response = await POST(request('{"phone":"synthetic secret"}'));
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).not.toContain("synthetic secret");
  });
});
