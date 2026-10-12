// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({
  getStore: vi.fn(),
  getWithMetadata: vi.fn(),
  setJSON: vi.fn(),
  list: vi.fn(),
}));
vi.mock("@netlify/blobs", () => ({ getStore: sdk.getStore }));
import { orderRepository } from "./netlify-store";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("Netlify order adapter", () => {
  function configured() {
    vi.stubEnv("ORDER_STORAGE_DRIVER", "netlify");
    vi.stubEnv("ORDER_STORAGE_NAMESPACE", "toolor-orders-test");
    sdk.getStore.mockReturnValue(sdk);
    return orderRepository()!;
  }
  it("keeps legacy mode explicit and rejects an unknown configured driver", () => {
    vi.stubEnv("ORDER_STORAGE_DRIVER", "");
    expect(orderRepository()).toBeUndefined();
    vi.stubEnv("ORDER_STORAGE_DRIVER", "typo");
    expect(() => orderRepository()).toThrow("Unsupported order storage driver");
    expect(sdk.getStore).not.toHaveBeenCalled();
  });
  it("requires a separate valid namespace without initializing SDK at build time", () => {
    vi.stubEnv("ORDER_STORAGE_DRIVER", "netlify");
    vi.stubEnv("ORDER_STORAGE_NAMESPACE", "");
    expect(() => orderRepository()).toThrow("Configure order namespace");
    configured();
    expect(sdk.getStore).not.toHaveBeenCalled();
  });
  it("uses strong reads and hides raw storage behind the repository", async () => {
    const repo = configured();
    sdk.getWithMetadata.mockResolvedValue(null);
    expect(await repo.get("d00e1d21-8ef7-4c53-8fc2-9b88ded49511")).toBeNull();
    expect(sdk.getStore).toHaveBeenCalledWith({
      name: "toolor-orders-test",
      consistency: "strong",
      fetch: expect.any(Function),
    });
    expect(sdk.getWithMetadata).toHaveBeenCalledWith(
      "references/d00e1d21-8ef7-4c53-8fc2-9b88ded49511",
      { type: "json", consistency: "strong" },
    );
  });
  it("does not accept a snapshot without its conditional-write version", async () => {
    const repo = configured();
    sdk.getWithMetadata.mockResolvedValue({ data: {} });
    await expect(
      repo.get("d00e1d21-8ef7-4c53-8fc2-9b88ded49511"),
    ).rejects.toThrow("Storage returned no version");
  });
});
