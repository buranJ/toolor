// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { telegramOperatorIds } from "./operators";
beforeEach(() => {
  vi.stubEnv("TELEGRAM_OPERATOR_ID", "123");
  vi.stubEnv("TELEGRAM_OPERATOR_IDS", "");
});
afterEach(() => vi.unstubAllEnvs());
it("keeps the original private employee when no allowlist is set", () => {
  expect(telegramOperatorIds("123")).toEqual(["123"]);
});
it("allows an additional approved 64-bit-safe private Telegram ID", () => {
  vi.stubEnv("TELEGRAM_OPERATOR_IDS", "123, 8009931442");
  expect(telegramOperatorIds("123")).toEqual(["123", "8009931442"]);
});
it.each([
  "456",
  "123,123",
  "123,",
  "123,-100123",
  "123,0",
  "123,1e3",
  "123,0123",
  "123,9007199254740993",
  "123,*",
])("fails closed for malformed/missing-primary allowlists: %s", (value) => {
  vi.stubEnv("TELEGRAM_OPERATOR_IDS", value);
  expect(() => telegramOperatorIds("123")).toThrow();
});
it("does not convert an old group recipient or mismatched operator into staff access", () => {
  expect(() => telegramOperatorIds("-100123")).toThrow();
  vi.stubEnv("TELEGRAM_OPERATOR_ID", "");
  expect(() => telegramOperatorIds("123")).toThrow();
});
