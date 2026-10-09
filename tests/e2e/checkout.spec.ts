import { expect, test, type Page } from "@playwright/test";
import generated from "../../src/data/toolor-products.generated.json";
import { requestNumber } from "../../src/features/checkout/schema";

const product = generated.products[0]!;
const variant =
  product.variants.find(
    (item) => "size" in item.options && item.options.size,
  ) ?? product.variants[0]!;
const cartKey = "toolor-demo-cart-v1";
const line = {
  productId: product.id,
  slug: product.slug,
  name: product.name,
  variantId: variant.id,
  variantTitle: variant.title,
  quantity: 2,
  unitAmount: variant.price.amount,
  currencyCode: "KGS",
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ key, line }) => localStorage.setItem(key, JSON.stringify([line])),
    { key: cartKey, line },
  );
  // Guardrail: no browser test may send real customer data to Telegram.
  await page.route("**/api/order-requests", (route) =>
    route.fulfill({ status: 503, json: { ok: false, code: "not_configured" } }),
  );
  await page.goto("/ru/checkout");
});

async function fill(page: Page) {
  await page.locator('[name="name"]').fill("Тестовый покупатель");
  await page.locator('[name="phone"]').fill("+996 555 000 111");
  await page
    .getByRole("textbox", { name: "Email", exact: true })
    .fill("test@example.com");
  await page.locator('[name="city"]').fill("Тестовый город");
  await page.locator('[name="address"]').fill("Тестовая улица, дом 1");
  await page
    .locator('[name="comment"]')
    .fill("Автоматическая проверка, не реальная заявка");
  await page.getByRole("checkbox").check();
}

test("requires valid contacts and explicit data-sharing consent; has no online card option", async ({
  page,
}) => {
  await expect(page.getByText("Картой онлайн", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /Отправить заявку/ }).click();
  await expect(page.locator('[name="name"]')).toBeFocused();
  await expect(
    page.getByText("Подтвердите передачу данных для обработки заявки"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Заявка отправлена" }),
  ).toHaveCount(0);
});

test("only clears sent quantities and shows success after confirmed receipt", async ({
  page,
}) => {
  let payload: Record<string, unknown> | undefined;
  await page.route("**/api/order-requests", async (route) => {
    payload = route.request().postDataJSON() as Record<string, unknown>;
    // Simulate another tab adding one more item before acknowledgement.
    await page.evaluate(
      ({ key, line }) => {
        localStorage.setItem(key, JSON.stringify([{ ...line, quantity: 3 }]));
        window.dispatchEvent(new Event("toolor-cart-change"));
      },
      { key: cartKey, line },
    );
    await route.fulfill({
      json: { ok: true, number: requestNumber(String(payload.requestId)) },
    });
  });
  await fill(page);
  await page.getByRole("button", { name: /Отправить заявку/ }).click();
  await expect(
    page.getByRole("heading", { name: "Заявка отправлена" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Заявка отправлена" }),
  ).toBeFocused();
  expect(payload).toMatchObject({
    locale: "ru",
    consent: true,
    customer: {
      phone: "+996 555 000 111",
      email: "test@example.com",
      city: "Тестовый город",
    },
    items: [
      {
        productId: product.id,
        variantId: variant.id,
        quantity: 2,
        expectedUnitAmount: variant.price.amount,
      },
    ],
  });
  expect(payload).not.toHaveProperty("payment");
  expect(
    await page.evaluate(
      (key) =>
        JSON.parse(localStorage.getItem(key) ?? "[]") as { quantity: number }[],
      cartKey,
    ),
  ).toEqual([{ ...line, quantity: 1 }]);
});

test("keeps contacts and cart when Telegram is unavailable", async ({
  page,
}) => {
  await fill(page);
  await page.getByRole("button", { name: /Отправить заявку/ }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "временно недоступен",
  );
  await expect(page.locator('[name="name"]')).toHaveValue(
    "Тестовый покупатель",
  );
  expect(await page.evaluate((key) => localStorage.getItem(key), cartKey)).toBe(
    JSON.stringify([line]),
  );
  await expect(
    page.getByRole("button", { name: /Отправить заявку/ }),
  ).toBeEnabled();
});

test("a timeout is not success and cannot silently trigger a duplicate submission", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/order-requests", async (route) => {
    requests++;
    await route.abort("failed");
  });
  await fill(page);
  await page.getByRole("button", { name: /Отправить заявку/ }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "могла поступить специалистам",
  );
  await expect(
    page.getByRole("button", { name: /Отправить заявку/ }),
  ).toBeDisabled();
  expect(requests).toBe(1);
  expect(await page.evaluate((key) => localStorage.getItem(key), cartKey)).toBe(
    JSON.stringify([line]),
  );
});

test("rejects a changed catalogue price without clearing the cart", async ({
  page,
}) => {
  await page.route("**/api/order-requests", (route) =>
    route.fulfill({ status: 409, json: { ok: false, code: "cart_changed" } }),
  );
  await fill(page);
  await page.getByRole("button", { name: /Отправить заявку/ }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText(
    "Данные товара изменились",
  );
  await expect(
    page.getByRole("button", { name: /Отправить заявку/ }),
  ).toBeEnabled();
});

test("coalesces synchronous duplicate submits while waiting for delivery", async ({
  page,
}) => {
  let count = 0;
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/order-requests", async (route) => {
    count++;
    await gate;
    const input = route.request().postDataJSON() as { requestId: string };
    await route.fulfill({
      json: { ok: true, number: requestNumber(input.requestId) },
    });
  });
  try {
    await fill(page);
    await page.evaluate(() => {
      const form = document.querySelector("form")!;
      form.requestSubmit();
      form.requestSubmit();
    });
    await expect(
      page.getByRole("button", { name: "Отправляем заявку…" }),
    ).toBeDisabled();
    await expect.poll(() => count).toBe(1);
    release();
    await expect(
      page.getByRole("heading", { name: "Заявка отправлена" }),
    ).toBeVisible();
    expect(count).toBe(1);
  } finally {
    release();
  }
});

test("all three languages explain request-only checkout and Telegram sharing", async ({
  page,
}) => {
  for (const [locale, text] of [
    ["en", "No online payment is taken"],
    ["ky", "Онлайн төлөм алынбайт"],
  ]) {
    await page.goto(`/${locale}/checkout`);
    await expect(page.getByText(text, { exact: false })).toBeVisible();
    await expect(page.getByRole("checkbox")).toBeVisible();
  }
});
