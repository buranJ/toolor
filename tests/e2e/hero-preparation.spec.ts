import { expect, test } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import tracks from "../../src/data/hero-tracks.json";

test("sustained decoder lag returns to the poster without collapsing the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const windowWithFlag = window as unknown as {
      forceHeroDecoderStall: boolean;
    };
    windowWithFlag.forceHeroDecoderStall = false;
    const decode = VideoDecoder.prototype.decode;
    VideoDecoder.prototype.decode = function (chunk) {
      if (!windowWithFlag.forceHeroDecoderStall) decode.call(this, chunk);
    };
  });
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  const hero = page.getByTestId("hero-scroll-video");
  await expect(hero).toHaveAttribute("data-hero-state", "ready", {
    timeout: 15000,
  });
  const height = await hero.evaluate((element) => element.clientHeight);
  await page.evaluate(() => {
    (
      window as unknown as { forceHeroDecoderStall: boolean }
    ).forceHeroDecoderStall = true;
    const element = document.querySelector<HTMLElement>(
      '[data-testid="hero-scroll-video"]',
    )!;
    scrollTo({
      top: (element.offsetHeight - innerHeight) * 0.8,
      behavior: "instant",
    });
  });
  await expect(hero).toHaveAttribute("data-hero-state", "poster", {
    timeout: 5000,
  });
  await expect(page.getByTestId("hero-scroll-media")).toHaveCount(0);
  expect(await hero.evaluate((element) => element.clientHeight)).toBe(height);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(844);
});

test("first visit shows the mountain poster, not motion or a blocking preloader", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const request = page.waitForRequest(/\/tracks\/mobile-.*\/complete\.bin$/);
  await page.route(/\/tracks\/mobile-.*\/complete\.bin$/, async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto("/ru", { waitUntil: "domcontentloaded" });
    await request;
    const hero = page.getByTestId("hero-scroll-video");
    await expect(hero).toHaveAttribute("data-hero-state", "loading");
    await expect(page.locator(".brand-preloader")).toHaveCount(0);
    await expect(page.getByTestId("hero-brand-logo")).toBeVisible();
    await expect(page.getByTestId("hero-scroll-media")).toHaveCSS(
      "opacity",
      "0",
    );
    expect(await hero.evaluate((element) => element.clientHeight)).toBe(844);
    await page.screenshot({ path: test.info().outputPath("poster-first.png") });
    release();
    await expect(hero).toHaveAttribute("data-hero-state", "ready", {
      timeout: 15000,
    });
    await expect(page.getByTestId("hero-scroll-media")).toHaveAttribute(
      "data-painted",
      "true",
    );
    expect(
      await hero.evaluate((element) => element.clientHeight),
    ).toBeGreaterThan(844);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("finishing preparation below the hero cannot shift the page or reset the scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const response = page.waitForResponse(/\/tracks\/mobile-.*\/complete\.bin$/);
  await page.route(/\/tracks\/mobile-.*\/complete\.bin$/, async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto("/ru", { waitUntil: "domcontentloaded" });
    const hero = page.getByTestId("hero-scroll-video");
    await expect(hero).toHaveAttribute("data-hero-state", "loading");
    await page.evaluate(() => scrollTo({ top: 1200, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(1200);
    release();
    await (await response).finished();
    await page.waitForTimeout(1700);
    expect(await page.evaluate(() => scrollY)).toBe(1200);
    expect(await hero.evaluate((element) => element.clientHeight)).toBe(844);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await expect(hero).toHaveAttribute("data-hero-state", "ready", {
      timeout: 15000,
    });
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("unsupported browsers do not download a track or 96 stills", async ({
  page,
}) => {
  await page.addInitScript(() => {
    delete (globalThis as { VideoDecoder?: unknown }).VideoDecoder;
  });
  const requests: string[] = [];
  page.on("request", (request) => {
    if (/\/media\/hero\/(tracks|frames)\//.test(request.url()))
      requests.push(request.url());
  });
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("hero-scroll-video")).toHaveAttribute(
    "data-hero-state",
    "poster",
  );
  await expect(page.locator(".hero-copy a")).toBeVisible();
  expect(requests).toEqual([]);
});

test("repeat visits reuse the immutable compressed asset", async ({
  page: isolatedPage,
  playwright,
  browserName,
  baseURL,
}) => {
  // Playwright's isolated WebKit contexts have no disk cache. Test its real
  // HTTP cache in a fresh persistent profile, never the user's browser profile.
  const directory =
    browserName === "webkit"
      ? await mkdtemp(join(tmpdir(), "toolor-hero-cache-"))
      : null;
  const context = directory
    ? await playwright.webkit.launchPersistentContext(directory, { baseURL })
    : null;
  const page = context ? await context.newPage() : isolatedPage;
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ru", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("hero-scroll-video")).toHaveAttribute(
      "data-hero-state",
      "ready",
      { timeout: 15000 },
    );
    // A repeat visit is a navigation, not an explicit reload.
    await page.goto("about:blank");
    await page.goto("/ru", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("hero-scroll-video")).toHaveAttribute(
      "data-hero-state",
      "ready",
      { timeout: 15000 },
    );
    const resource = await page.evaluate((url) => {
      const entry = performance.getEntriesByName(location.origin + url)[0] as
        PerformanceResourceTiming | undefined;
      return { transfer: entry?.transferSize, decoded: entry?.decodedBodySize };
    }, tracks.mobile.baseUrl + "/complete.bin");
    // A persistent WebKit profile may report decodedBodySize=0 for a validated
    // cache response. It has already decoded the track to reach "ready" above.
    if (resource.decoded !== 0 || browserName !== "webkit")
      expect(resource.decoded).toBe(
        tracks.mobile.sizes.reduce((sum, size) => sum + size, 0),
      );
    // WebKit may revalidate (headers only); none may transfer the 4.8 MB again.
    expect(resource.transfer).toBeLessThan(1024);
  } finally {
    await context?.close();
    if (directory) await rm(directory, { recursive: true, force: true });
  }
});
