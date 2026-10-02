import { expect, test } from "@playwright/test";

type Audit = {
  frames: { index: number; at: number }[];
};
type AuditedWindow = Window & { heroAudit: Audit };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state: Audit = { frames: [] };
    (window as unknown as AuditedWindow).heroAudit = state;
    const cached = new WeakMap<CanvasImageSource, number>();
    const original = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (
      image: CanvasImageSource,
      ...args: number[]
    ) {
      // Preserve all three native overloads while observing actual pixels
      // sent to the hero (CSS scroll progress alone cannot catch a stall).
      Reflect.apply(original, this, [image, ...args]);
      const index =
        typeof VideoFrame !== "undefined" && image instanceof VideoFrame
          ? image.timestamp
          : cached.get(image);
      if (index !== undefined) {
        cached.set(this.canvas, index);
        if (
          this.canvas instanceof HTMLCanvasElement &&
          this.canvas.dataset.testid === "hero-scroll-media"
        )
          state.frames.push({ index, at: performance.now() });
      }
    };
  });
});

test("cold mobile seek fetches the requested end without waiting for earlier groups", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // A delayed early group models a slow cold CDN response. It must never
  // block a seek to an independently decodable group at the end.
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/tracks\/mobile-[a-f0-9]+\/g001\.bin$/, async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto("/ru", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("hero-scroll-media")).toHaveAttribute(
      "data-painted",
      "true",
    );
    await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>(
        '[data-testid="hero-scroll-video"]',
      )!;
      window.scrollTo({
        top:
          hero.getBoundingClientRect().top +
          scrollY +
          (hero.offsetHeight - innerHeight) * 0.9,
        behavior: "instant",
      });
    });
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as unknown as AuditedWindow).heroAudit.frames.at(-1)
                ?.index,
          ),
        { timeout: 5000 },
      )
      .toBeGreaterThanOrEqual(320);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as unknown as AuditedWindow).heroAudit.frames.at(-1)
                ?.index,
          ),
        { timeout: 5000 },
      )
      .toBe(0);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("a missing video segment falls back to full-resolution stills", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(/\/tracks\/mobile-.*\.bin$/, (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  const still = page.waitForRequest(/\/frames\/mobile\/f001\.webp$/);
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  await still;
  await expect(page.getByTestId("hero-scroll-media")).toHaveAttribute(
    "data-painted",
    "true",
  );
});

test("reduced motion does not request video or frame sequences", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  // Product photos are hosted elsewhere and may keep the network busy even
  // after the hero has finished hydrating.
  await expect(page.locator(".brand-preloader")).toHaveCount(0, {
    timeout: 15_000,
  });
  await expect(page.getByTestId("hero-scroll-media")).toHaveCount(0);
  expect(
    requests.filter((url) => /\/media\/hero\/(tracks|frames)\//.test(url)),
  ).toEqual([]);
});

test("desktop and phone canvases survive a breakpoint change", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("hero-scroll-media")).toHaveAttribute(
    "data-painted",
    "true",
  );
  const mobile = page.waitForResponse(/\/tracks\/mobile-.*\/g000\.bin$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await mobile;
  await expect
    .poll(() =>
      page.evaluate(() => {
        const canvas = document.querySelector<HTMLCanvasElement>(
          '[data-testid="hero-scroll-media"]',
        )!;
        const pixel = canvas
          .getContext("2d")!
          .getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
        return pixel[0]! + pixel[1]! + pixel[2]!;
      }),
    )
    .toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
