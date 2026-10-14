import { expect, test } from "@playwright/test";
import generated from "../../src/data/toolor-products.generated.json";

test("all new source products are reachable through catalog pagination", async ({
  page,
}) => {
  const found = new Set<string>();
  for (
    let index = 1;
    index <= Math.ceil(generated.products.length / 12);
    index++
  ) {
    await page.goto(`/ru/catalog?page=${index}`, {
      waitUntil: "domcontentloaded",
    });
    const cards = page.getByTestId("product-card");
    for (const href of await cards
      .locator("h3 a")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("href")),
      )) {
      if (href) found.add(href);
    }
  }
  expect([...found].sort()).toEqual(
    generated.products.map((p) => `/ru/product/${p.slug}`).sort(),
  );
});

test("catalog photos are local, responsive, and alternate photos load only on interaction", async ({
  page,
}) => {
  const externalImages: string[] = [];
  page.on("request", (request) => {
    if (
      request.resourceType() === "image" &&
      /coolgroupteam|postimg|m-market/.test(request.url())
    )
      externalImages.push(new URL(request.url()).hostname);
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ru/catalog", { waitUntil: "domcontentloaded" });
  const first = page.getByTestId("product-card").first();
  await expect(first.locator("img")).toHaveCount(1);
  const primary = first.locator("img").first();
  await expect
    .poll(
      () =>
        primary.evaluate((image) => (image as HTMLImageElement).naturalWidth),
      { timeout: 20000 },
    )
    .toBeGreaterThan(0);
  await expect(primary).toHaveAttribute("src", /media%2Fproducts%2F/);
  await first.locator("a").first().hover();
  await expect(first.locator("img")).toHaveCount(2);
  await expect
    .poll(
      () =>
        first
          .locator("img")
          .nth(1)
          .evaluate((image) => (image as HTMLImageElement).naturalWidth),
      { timeout: 20000 },
    )
    .toBeGreaterThan(0);
  await expect(primary).not.toHaveClass(/opacity-0/);
  expect(externalImages).toEqual([]);
});

test("unpriced source product is visible but cannot be submitted as a zero-price order", async ({
  page,
}) => {
  const product = generated.products.find((p) => p.priceStatus === "unknown");
  if (!product) throw new Error("Unknown-price source fixture missing");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/ru/product/${product.slug}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    product.name,
  );
  await expect(
    page
      .locator(".product-info-panel")
      .getByText("Цена уточняется", { exact: true })
      .first(),
  ).toBeVisible();
  const buttons = page.getByRole("button", {
    name: "Цена уточняется",
    exact: true,
  });
  expect(await buttons.count()).toBeGreaterThan(0);
  for (const button of await buttons.all()) await expect(button).toBeDisabled();
  const jsonLd = JSON.parse(
    await page.locator('script[type="application/ld+json"]').innerText(),
  );
  expect(jsonLd).not.toHaveProperty("offers");
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
});

test("unisex and the updated homepage shirt category contain new products", async ({
  page,
}) => {
  await page.goto("/ru/catalog/unisex", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("product-card")).toHaveCount(1);
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  await page
    .getByTestId("featured-category-mosaic")
    .getByRole("link", { name: /Рубашки/ })
    .click();
  await expect(page.getByTestId("product-card").first()).toBeVisible();
});
