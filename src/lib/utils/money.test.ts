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
});
