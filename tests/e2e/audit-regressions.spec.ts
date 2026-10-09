import { expect, test } from "@playwright/test";
import { sampleProduct } from "./catalog-fixture";

test("catalogue pagination preserves filters and reaches later products", async ({
  page,
}) => {
  await page.goto("/ru/catalog?sort=price-asc", {
    waitUntil: "domcontentloaded",
  });
  const first = await page.getByTestId("product-card").first().innerText();
  const next = page.getByRole("link", { name: "Далее", exact: true });
  await expect(next).toHaveAttribute("href", /sort=price-asc.*page=2/);
  await next.click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByTestId("product-card").first()).not.toHaveText(first);
  await expect(
    page.getByRole("link", { name: "Страница 2", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("bad filters and repeated search parameters never break a route", async ({
  page,
}) => {
  for (const route of [
    "/ru/catalog?gender=invalid&minPrice=oops",
    "/ru/catalog?q=" + "a".repeat(101),
    "/ru/search?q=one&q=two",
  ]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByText("Что-то пошло не так.", { exact: true }),
    ).toHaveCount(0);
  }
});

test("photo viewer traps focus and restores it on Escape", async ({ page }) => {
  await page.goto(`/ru/product/${sampleProduct.slug}`, {
    waitUntil: "domcontentloaded",
  });
  const opener = page.locator(".product-gallery-zoom");
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Просмотр фото товара" });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        Boolean(document.activeElement?.closest(".product-viewer")),
      ),
    ).toBe(true);
  }
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(
      await page.evaluate(() =>
        Boolean(document.activeElement?.closest(".product-viewer")),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator(".product-viewer-nav span")).toHaveText(/^02/);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("the primary public domain is used consistently in SEO", async ({
  page,
  request,
}) => {
  await page.goto("/ru/about", { waitUntil: "domcontentloaded" });
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://toolor.store/ru/about",
  );
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    "toolorkg.com",
  );
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "https://toolor.store/sitemap.xml",
  );
});

test("prefetching a translation cannot overwrite the chosen language", async ({
  page,
}) => {
  await page.goto("/en/about", { waitUntil: "domcontentloaded" });
  await page
    .context()
    .request.get("/ky/about", { headers: { "next-router-prefetch": "1" } });
  await page.waitForTimeout(800);
  await page.goto("/about", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/en\/about$/);
});
