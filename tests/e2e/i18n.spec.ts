import { expect, test } from "@playwright/test";

import { sampleProduct } from "./catalog-fixture";

test("unprefixed paths redirect to the Accept-Language locale", async ({
  browser,
}) => {
  for (const [locale, expected] of [
    ["en-GB", "/en"],
    ["ky-KG", "/ky"],
    ["ru-RU", "/ru"],
    // Unsupported languages fall back to the default locale.
    ["de-DE", "/ru"],
  ] as const) {
    const context = await browser.newContext({ locale });
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`${expected}$`));
    await context.close();
  }
});

test("each locale renders its own language and html lang", async ({ page }) => {
  for (const [path, lang, needle] of [
    ["/ru", "ru", "Сделано в Кыргызстане"],
    ["/en", "en", "Made in Kyrgyzstan"],
    ["/ky", "ky", "Кыргызстанда жасалган"],
  ] as const) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.locator(".site-footer")).toContainText(needle);
  }
});

test("every page advertises all three hreflang alternates", async ({
  page,
}) => {
  await page.goto("/en/about", { waitUntil: "domcontentloaded" });

  for (const [locale, href] of [
    ["ru", "/ru/about"],
    ["en", "/en/about"],
    ["ky", "/ky/about"],
  ] as const) {
    await expect(
      page.locator(`link[rel="alternate"][hreflang="${locale}"]`),
    ).toHaveAttribute("href", new RegExp(`${href}$`));
  }
});

test("the switcher keeps the route and query, and swaps the language", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ru/catalog?sort=price-asc", {
    waitUntil: "domcontentloaded",
  });

  // Header, mobile dialog and footer each render a switcher; take the visible one.
  const toEnglish = page
    .locator('.language-switcher a[hreflang="en"]')
    .locator("visible=true")
    .first();
  await expect(toEnglish).toHaveAttribute("href", /^\/en\/catalog\?/);
  await toEnglish.click();

  await expect(page).toHaveURL(/\/en\/catalog\?.*sort=price-asc/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { level: 1, name: "Catalogue" }),
  ).toBeVisible();
  await expect(page.locator("select[name=sort]:visible")).toHaveValue(
    "price-asc",
  );
});

test("the chosen language is remembered on the next visit", async ({
  browser,
}) => {
  // Browser asks for Russian, but the visitor picked Kyrgyz earlier.
  const context = await browser.newContext({ locale: "ru-RU" });
  const page = await context.newPage();

  await page.goto("/ky", { waitUntil: "domcontentloaded" });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/ky$/);
  await context.close();
});

test("product copy stays in its source language across locales", async ({
  page,
}) => {
  // Imported workbook data is deliberately not translated.
  for (const locale of ["ru", "en", "ky"]) {
    await page.goto(`/${locale}/product/${sampleProduct.slug}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      sampleProduct.name,
    );
  }

  // ...while the surrounding interface does translate.
  await page.goto(`/en/product/${sampleProduct.slug}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("button", { name: /Add to cart/ }).first(),
  ).toBeVisible();
});
