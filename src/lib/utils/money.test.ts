import { describe, expect, it } from "vitest";

import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("formats minor KGS units without decimals", () => {
    const result = formatMoney({ amount: 123400, currencyCode: "KGS" });

    expect(result.replaceAll("\u00a0", " ")).toMatch(/1 234/);
    expect(result).toMatch(/сом|KGS/);
  });

  it("formats USD minor units with cents", () => {
    expect(formatMoney({ amount: 1234, currencyCode: "USD" })).toBe("$12.34");
  });

  it("formats the same amount per UI locale", () => {
    const price = { amount: 123400, currencyCode: "KGS" } as const;

    const ru = formatMoney(price, "ru");
    const en = formatMoney(price, "en");
    const ky = formatMoney(price, "ky");

    // Every locale renders the same value, each with its own conventions.
    for (const result of [ru, en, ky]) {
      expect(result.replace(/\D/g, "")).toBe("1234");
    }
    // English leads with the currency code; Russian and Kyrgyz trail with "сом".
    expect(en.trim().startsWith("KGS")).toBe(true);
    expect(ru.trim().endsWith("сом")).toBe(true);
    expect(ky.trim().endsWith("сом")).toBe(true);
    expect(en).not.toBe(ru);
  });

  it("formats Kyrgyz exactly like Russian", () => {
    // Guards the hydration fix: `ky-KG` currency data exists in Node's ICU but
    // not in browsers, so the two disagreed on "сом" vs "KGS" and React bailed
    // out. Kyrgyz money formatting is pinned to the Russian one instead.
    const price = { amount: 123400, currencyCode: "KGS" } as const;

    expect(formatMoney(price, "ky")).toBe(formatMoney(price, "ru"));
    expect(formatMoney({ amount: 0, currencyCode: "KGS" }, "ky")).toBe(
      formatMoney({ amount: 0, currencyCode: "KGS" }, "ru"),
    );
  });
});
