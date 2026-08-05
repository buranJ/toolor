import { expect, test } from "@playwright/test";

test("homepage smoke", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/TOOLOR/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Modern nomads",
  );
  await expect(
    page.getByRole("link", { name: "Каталог" }).first(),
  ).toBeVisible();
});

test("mobile hero uses the portrait video and follows scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const hero = page.getByTestId("hero-scroll-video");
  const video = page.getByTestId("hero-scroll-media");

  await expect(video).toHaveAttribute(
    "src",
    "/media/hero/hero-scroll-mobile.mp4",
  );
  await expect(video).toHaveAttribute("playsinline", "");

  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.4));

  await expect
    .poll(
      () =>
        hero.evaluate((element) =>
          Number(element.style.getPropertyValue("--hero-progress")),
        ),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0.1);
  await expect
    .poll(
      () =>
        video.evaluate((element) =>
          element instanceof HTMLVideoElement ? element.currentTime : 0,
        ),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(0.25);
});

test("app promotion is available on home and about pages", async ({ page }) => {
  for (const route of ["/", "/about"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const section = page.locator("#app");

    await expect(
      section.getByRole("heading", { name: /TOOLOR всегда с вами/ }),
    ).toBeVisible();
    await expect(
      section.getByRole("link", { name: "Открыть TOOLOR в Google Play" }),
    ).toHaveAttribute(
      "href",
      "https://play.google.com/store/apps/details?id=com.toolor.toolor_app&pcampaignid=web_share",
    );
    await expect(
      section.getByRole("link", { name: "Открыть TOOLOR в App Store" }),
    ).toHaveAttribute(
      "href",
      "https://apps.apple.com/kg/app/toolor/id6761310984",
    );
    await expect(section.getByRole("img", { name: /QR-код/ })).toHaveCount(2);

    const footer = page.locator(".site-footer");
    await expect(
      footer.getByRole("link", { name: "Скачать TOOLOR в Google Play" }),
    ).toHaveAttribute(
      "href",
      "https://play.google.com/store/apps/details?id=com.toolor.toolor_app&pcampaignid=web_share",
    );
    await expect(
      footer.getByRole("link", { name: "Скачать TOOLOR в App Store" }),
    ).toHaveAttribute(
      "href",
      "https://apps.apple.com/kg/app/toolor/id6761310984",
    );
  }
});

test("featured collection carousel changes the active product", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const carousel = page.getByTestId("featured-carousel");
  await expect(carousel).toBeVisible();
  await expect(
    carousel.locator('.featured-carousel-slide[data-active="true"]'),
  ).toHaveAttribute("aria-label", /^1 из 7:/);

  await carousel.locator(".featured-carousel-dot").nth(1).click();

  await expect(
    carousel.locator('.featured-carousel-slide[data-active="true"]'),
  ).toHaveAttribute("aria-label", /^2 из 7:/);
});

test("featured category mosaic opens a filtered catalog", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const mosaic = page.getByTestId("featured-category-mosaic");
  await expect(mosaic.locator(".featured-category-tile")).toHaveCount(6);
  await mosaic.getByRole("link", { name: /Брюки/ }).click();

  await expect(page).toHaveURL(/q=%D0%91%D1%80%D1%8E%D0%BA%D0%B8/, {
    timeout: 15_000,
  });
  await expect(page.getByTestId("product-card").first()).toBeVisible();
});

test("catalog smoke", async ({ page }) => {
  await page.goto("/catalog?sort=price-asc", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Каталог" }),
  ).toBeVisible();
  await expect(page.getByTestId("product-card").first()).toBeVisible();
  await expect(page.locator("select[name=sort]:visible")).toHaveValue(
    "price-asc",
  );
});

test("desktop catalog filters stay compact and update the URL", async ({
  page,
}) => {
  await page.goto("/catalog?sort=price-asc", {
    waitUntil: "domcontentloaded",
  });
  await page.locator("details summary").click();
  const filterPanel = page.locator("details form");
  await expect(filterPanel).toBeVisible();
  await filterPanel.locator('select[name="gender"]').selectOption("women");
  await filterPanel.getByRole("button", { name: /Показать/ }).click();
  await expect(page).toHaveURL(/gender=women/);
  await expect(page.getByTestId("product-card").first()).toBeVisible();
});

test("product page smoke", async ({ page }) => {
  await page.goto("/product/toolor-ta-26-1", {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Кепка бейсболка Toolor ASKA/,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /В корзину/ }).first(),
  ).toBeVisible();
  expect(
    await page.locator(".product-gallery-thumbnail").count(),
  ).toBeGreaterThanOrEqual(2);
  await page.getByRole("button", { name: "Показать изображение 2" }).click();
  await expect(
    page.getByRole("button", { name: "Показать изображение 2" }),
  ).toHaveAttribute("aria-current", "true");

  const descriptionAccordion = page.locator(".product-accordion").first();
  await expect(descriptionAccordion).toHaveAttribute("open", "");
  await descriptionAccordion.locator("summary").click();
  await expect(descriptionAccordion).not.toHaveAttribute("open", "");
});

test("mobile menu, cart drawer and cart page smoke", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/product/toolor-ta-26-1", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator('[data-purchase-ready="true"]')).toBeAttached();

  await page
    .getByRole("button", { name: /В корзину/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("link", { name: "Открыть корзину" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Корзина" }),
  ).toBeVisible();

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Открыть меню/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("key responsive breakpoints do not overflow", async ({ page }) => {
  for (const width of [375, 430, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(
      dimensions.scrollWidth,
      `horizontal overflow at ${width}px`,
    ).toBeLessThanOrEqual(dimensions.clientWidth);
  }
});
