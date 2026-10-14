import { describe, expect, it } from "vitest";
import { getProductColorHex } from "./product-color";

describe("source color swatches", () => {
  it("handles Cyrillic ё and spaced/hyphenated supplier spellings", () => {
    expect(getProductColorHex("Чёрный")).toBe(getProductColorHex("черный"));
    expect(getProductColorHex("Тёмно синий")).toBe(
      getProductColorHex("темно-синий"),
    );
    expect(getProductColorHex("Белый(розовая вышивка)")).toBe(
      getProductColorHex("Белый"),
    );
    expect(getProductColorHex("Лайм")).toBeDefined();
    expect(getProductColorHex("Мультицвет")).toBeUndefined();
  });
});
