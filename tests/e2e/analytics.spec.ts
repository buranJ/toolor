import { expect, test } from "@playwright/test";

test("production analytics load once and count client navigation without duplicates", async ({
  page,
}) => {
  const vendors: string[] = [];
  await page.route(
    /https:\/\/(mc\.yandex\.ru|connect\.facebook\.net|www\.googletagmanager\.com)\//,
    async (route) => {
      vendors.push(route.request().url());
      // Do not send synthetic visits to the actual SEO dashboards.
      await route.fulfill({
        contentType: "application/javascript",
        body: "/* isolated vendor */",
      });
    },
  );
  const response = await page.goto("/ru", { waitUntil: "domcontentloaded" });
  const html = await response?.text();
  test.skip(
    !html?.includes("mc.yandex.ru/watch/113868680"),
    "Analytics intentionally disabled in development; run against pnpm build/start.",
  );
  expect(html).toContain("webvisor:true");
  await expect(page.locator("#toolor-metrika")).toHaveCount(1);
  await expect(page.locator("#toolor-site-analytics")).toHaveCount(1);
  const counts = () =>
    page.evaluate(() => {
      const browser = window as unknown as {
        ym: { a: unknown[][] };
        fbq: { queue: unknown[][]; disablePushState: boolean };
        dataLayer: { event?: string }[];
      };
      return {
        hits: browser.ym.a.filter((call) => call[1] === "hit").length,
        views: browser.fbq.queue.filter(
          (call) => call[0] === "track" && call[1] === "PageView",
        ).length,
        gtm: browser.dataLayer.filter((entry) => entry.event === "gtm.js")
          .length,
        routes: browser.dataLayer.filter(
          (entry) => entry.event === "toolor_page_view",
        ).length,
        automaticMetaHistory: browser.fbq.disablePushState,
      };
    });
  await expect.poll(counts).toEqual({
    hits: 0,
    views: 1,
    gtm: 1,
    routes: 1,
    automaticMetaHistory: true,
  });
  await page.locator('a[href="/ru/catalog"]').first().click();
  await expect(page).toHaveURL(/\/ru\/catalog$/);
  await expect.poll(counts).toEqual({
    hits: 1,
    views: 2,
    gtm: 1,
    routes: 2,
    automaticMetaHistory: true,
  });
  await page.goBack();
  await expect(page).toHaveURL(/\/ru$/);
  await expect.poll(counts).toEqual({
    hits: 2,
    views: 3,
    gtm: 1,
    routes: 3,
    automaticMetaHistory: true,
  });
  expect(vendors.filter((url) => url.includes("metrika/tag.js"))).toHaveLength(
    1,
  );
  expect(vendors.filter((url) => url.includes("fbevents.js"))).toHaveLength(1);
  expect(vendors.filter((url) => url.includes("gtm.js"))).toHaveLength(1);
});

test("production noscript fallbacks are present without breaking the storefront", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  try {
    const requests: string[] = [];
    await context.route(
      /https:\/\/(mc\.yandex\.ru|www\.facebook\.com|www\.googletagmanager\.com)\//,
      async (route) => {
        requests.push(route.request().url());
        await route.fulfill({ status: 204, body: "" });
      },
    );
    const page = await context.newPage();
    await page.goto("/ru", { waitUntil: "load" });
    const images = page.locator('noscript img[src*="113868680"]');
    test.skip((await images.count()) === 0, "Production-only analytics.");
    await expect(images).toHaveCount(1);
    expect(requests.some((url) => url.includes("113868680"))).toBe(true);
    expect(requests.some((url) => url.includes("1210121161991189"))).toBe(true);
    expect(requests.some((url) => url.includes("GTM-MDMS6X7F"))).toBe(true);
    await expect(page.locator("main")).toBeVisible();
  } finally {
    await context.close();
  }
});
