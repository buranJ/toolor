import { describe, expect, it } from "vitest";

import { defaultLocale, isLocale, locales, type Locale } from "./config";
import { format, getDictionary, plural } from "./dictionary";
import {
  localeAlternates,
  localePath,
  splitLocale,
  switchLocalePath,
} from "./routing";

/** Every leaf path in a nested message object, as "a.b.c". */
function leafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];

  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("dictionaries", () => {
  const russian = leafPaths(getDictionary("ru")).sort();

  it.each(locales)("%s exposes exactly the Russian key set", (locale) => {
    expect(leafPaths(getDictionary(locale)).sort()).toEqual(russian);
  });

  it.each(locales)(
    "%s leaves no message empty except known blanks",
    (locale) => {
      // These are intentionally blank eyebrows in the design.
      const allowedBlank = new Set([
        "home.categoryMosaic.kicker",
        "checkout.paymentOptions.cardNote",
      ]);
      const dictionary = getDictionary(locale) as unknown as Record<
        string,
        unknown
      >;

      const blanks = leafPaths(dictionary).filter((path) => {
        const value = path
          .split(".")
          .reduce<unknown>(
            (node, key) => (node as Record<string, unknown>)?.[key],
            dictionary,
          );
        return typeof value === "string" && value.trim() === "";
      });

      expect(blanks.filter((path) => !allowedBlank.has(path))).toEqual([]);
    },
  );

  it("falls back to the default locale for an unknown one", () => {
    const unknown = "de" as Locale;
    expect(getDictionary(unknown)).toBe(getDictionary(defaultLocale));
  });
});

describe("format", () => {
  it("substitutes named placeholders", () => {
    expect(format("© {year} TOOLOR", { year: 2026 })).toBe("© 2026 TOOLOR");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(format("{a} и {b}", { a: "раз" })).toBe("раз и {b}");
  });
});

describe("plural", () => {
  it("applies Russian one/few/many rules", () => {
    const forms = getDictionary("ru").common.productCount;
    expect(plural("ru", 1, forms)).toBe("товар");
    expect(plural("ru", 3, forms)).toBe("товара");
    expect(plural("ru", 11, forms)).toBe("товаров");
    expect(plural("ru", 25, forms)).toBe("товаров");
  });

  it("applies English one/other rules", () => {
    const forms = getDictionary("en").common.productCount;
    expect(plural("en", 1, forms)).toBe("product");
    expect(plural("en", 2, forms)).toBe("products");
  });
});

describe("routing helpers", () => {
  it("prefixes app paths and leaves the root clean", () => {
    expect(localePath("en", "/")).toBe("/en");
    expect(localePath("en", "/catalog")).toBe("/en/catalog");
  });

  it("never double-prefixes an already localised path", () => {
    expect(localePath("en", "/en/catalog")).toBe("/en/catalog");
  });

  it("passes external and non-app hrefs through untouched", () => {
    expect(localePath("en", "https://example.com")).toBe("https://example.com");
    expect(localePath("en", "mailto:info@toolorkg.com")).toBe(
      "mailto:info@toolorkg.com",
    );
    expect(localePath("en", "#app")).toBe("#app");
  });

  it("splits a pathname into locale and rest", () => {
    expect(splitLocale("/ky/catalog/men")).toEqual({
      locale: "ky",
      rest: "/catalog/men",
    });
    expect(splitLocale("/ru")).toEqual({ locale: "ru", rest: "/" });
    expect(splitLocale("/catalog")).toEqual({
      locale: defaultLocale,
      rest: "/catalog",
    });
  });

  it("swaps the locale while preserving the route", () => {
    expect(switchLocalePath("/ru/catalog/men", "en")).toBe("/en/catalog/men");
    expect(switchLocalePath("/ru", "ky")).toBe("/ky");
  });

  it("builds one alternate per locale", () => {
    expect(localeAlternates("/about")).toEqual({
      ru: "/ru/about",
      en: "/en/about",
      ky: "/ky/about",
    });
  });
});

describe("isLocale", () => {
  it("accepts supported locales and rejects everything else", () => {
    expect(isLocale("ru")).toBe(true);
    expect(isLocale("ky")).toBe(true);
    expect(isLocale("de")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
