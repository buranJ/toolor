import { expect, test } from "@playwright/test";
import tracks from "../../src/data/hero-tracks.json";

// Exercise native-resolution canvas buffers, not just low-density desktop
// screenshots resized to a phone viewport.
test.use({ deviceScaleFactor: 3 });

type Audit = {
  frames: { index: number; at: number }[];
};
type AuditedWindow = Window & { heroAudit: Audit };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state: Audit = { frames: [] };
    (window as unknown as AuditedWindow).heroAudit = state;
    const cached = new WeakMap<CanvasImageSource, number>();
    const observeDraw = (
      prototype: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    ) => {
      const original = prototype.drawImage;
      prototype.drawImage = function (
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
    };
    observeDraw(CanvasRenderingContext2D.prototype);
    if (typeof OffscreenCanvasRenderingContext2D !== "undefined")
      observeDraw(OffscreenCanvasRenderingContext2D.prototype);
    if (typeof OffscreenCanvas !== "undefined") {
      const transfer = OffscreenCanvas.prototype.transferToImageBitmap;
      OffscreenCanvas.prototype.transferToImageBitmap = function () {
        const bitmap = transfer.call(this);
        const index = cached.get(this);
        if (index !== undefined) cached.set(bitmap, index);
        return bitmap;
      };
    }
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
  await expect(page.locator(".hero-copy")).toHaveCSS("opacity", "1");
  await expect(page.locator(".hero-copy a")).toBeVisible();
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

test("data saver keeps the hero CTA and does not load animation", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true },
    }),
  );
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("hero-scroll-video")).toHaveAttribute(
    "data-still",
    "true",
  );
  await expect(page.locator(".hero-copy")).toHaveCSS("opacity", "1");
  await page.waitForTimeout(500);
  expect(
    requests.filter((url) => /\/media\/hero\/(tracks|frames)\//.test(url)),
  ).toEqual([]);
});

test("stationary mobile hero downloads only a small neighbourhood", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests: string[] = [];
  page.on("request", (request) => {
    if (/\/tracks\/mobile-/.test(request.url())) requests.push(request.url());
  });
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("hero-scroll-media")).toHaveAttribute(
    "data-painted",
    "true",
  );
  await page.waitForTimeout(1500);
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.length).toBeLessThanOrEqual(3);
});

test("decoder bursts produce at most one hero draw per display tick", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { tick: 0, draws: {} as Record<number, number> };
    (
      window as unknown as { presentationAudit: typeof state }
    ).presentationAudit = state;
    const tick = () => {
      state.tick++;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (
      image: CanvasImageSource,
      ...args: number[]
    ) {
      Reflect.apply(draw, this, [image, ...args]);
      if (
        this.canvas instanceof HTMLCanvasElement &&
        this.canvas.dataset.testid === "hero-scroll-media"
      ) {
        state.draws[state.tick] = (state.draws[state.tick] ?? 0) + 1;
      }
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("hero-scroll-media")).toHaveAttribute(
    "data-painted",
    "true",
  );
  await page.evaluate(async () => {
    const state = (
      window as unknown as {
        presentationAudit: { draws: Record<number, number> };
      }
    ).presentationAudit;
    state.draws = {};
    const hero = document.querySelector<HTMLElement>(
      '[data-testid="hero-scroll-video"]',
    )!;
    const end = hero.offsetHeight - innerHeight;
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const step = (now: number) => {
        const elapsed = Math.min(1, (now - start) / 1800);
        const progress =
          elapsed < 0.5 ? elapsed * 1.6 : 0.8 - (elapsed - 0.5) * 1.2;
        scrollTo({ top: end * progress, behavior: "instant" });
        if (elapsed < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  });
  const draws = await page.evaluate(() =>
    Object.values(
      (
        window as unknown as {
          presentationAudit: { draws: Record<number, number> };
        }
      ).presentationAudit.draws,
    ),
  );
  expect(draws.length).toBeGreaterThan(5);
  expect(Math.max(...draws)).toBe(1);
});

test("a dense mobile canvas retains native geometry across toolbar-sized resizes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  const canvas = page.getByTestId("hero-scroll-media");
  await expect(canvas).toHaveAttribute("data-painted", "true");
  const dimensions = () =>
    canvas.evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      return { width: canvas.width, height: canvas.height };
    });
  expect(await dimensions()).toEqual({
    width: tracks.mobile.width,
    height: tracks.mobile.height,
  });
  await expect(canvas).toHaveCSS("object-fit", "cover");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
    "filter",
    "none",
  );
  await page.setViewportSize({ width: 390, height: 780 });
  await expect(canvas).toHaveAttribute("data-painted", "true");
  expect(await dimensions()).toEqual({
    width: tracks.mobile.width,
    height: tracks.mobile.height,
  });
});

test("the composed mobile hero has no black compositor tile below the logo", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("hero-scroll-media")).toHaveAttribute(
    "data-painted",
    "true",
  );
  await expect(page.locator(".brand-preloader")).toHaveCount(0);
  // Canvas pixels alone passed while WebKit's compositor painted a black
  // 112px square above them. Read the final screenshot, not the source canvas.
  const screenshot = (await page.screenshot()).toString("base64");
  const brightness = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const scale = canvas.width / innerWidth;
    const values = [10, 30, 70].map((x) => {
      const pixel = context.getImageData(
        Math.round(x * scale),
        Math.round(90 * scale),
        1,
        1,
      ).data;
      return pixel[0]! + pixel[1]! + pixel[2]!;
    });
    canvas.width = canvas.height = 0;
    return values;
  }, screenshot);
  expect(Math.min(...brightness)).toBeGreaterThan(30);
});

test("hero survives quick direction changes, offscreen release and return", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("hero-scroll-media")).toHaveAttribute(
    "data-painted",
    "true",
  );
  for (const progress of [0.85, 0.2, 0.95, 0.45, 0.75, 0]) {
    await page.evaluate((progress) => {
      const hero = document.querySelector<HTMLElement>(
        '[data-testid="hero-scroll-video"]',
      )!;
      scrollTo({
        top: (hero.offsetHeight - innerHeight) * progress,
        behavior: "instant",
      });
    }, progress);
    await page.waitForTimeout(150);
  }
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as unknown as AuditedWindow).heroAudit.frames.at(-1)?.index,
        ),
      { timeout: 10_000 },
    )
    .toBe(0);
  await page.evaluate(() =>
    scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
  );
  await page.waitForTimeout(1700);
  await page.evaluate(() => {
    (window as unknown as AuditedWindow).heroAudit.frames = [];
    scrollTo({ top: 0, behavior: "instant" });
  });
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as unknown as AuditedWindow).heroAudit.frames.at(-1)?.index,
        ),
      { timeout: 10_000 },
    )
    .toBe(0);
  expect(errors).toEqual([]);
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

test("reverse-frame cache preserves native decoded pixels and colour", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  // DOMContentLoaded can precede Next's streamed CSS. Await the real first
  // paint before measuring the hero's scroll range (otherwise its height is 0).
  await expect(page.getByTestId("hero-scroll-media")).toHaveAttribute(
    "data-painted",
    "true",
  );
  for (const [progress, index] of [
    [0.75, 270],
    [0.5, 180],
  ] as const) {
    await page.evaluate((progress) => {
      const hero = document.querySelector<HTMLElement>(
        '[data-testid="hero-scroll-video"]',
      )!;
      scrollTo({
        top: (hero.offsetHeight - innerHeight) * progress,
        behavior: "instant",
      });
    }, progress);
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as unknown as AuditedWindow).heroAudit.frames.at(-1)
                ?.index,
          ),
        { timeout: 15_000 },
      )
      .toBe(index);
  }
  const difference = await page.evaluate(async (track) => {
    const bytes = new Uint8Array(
      await (await fetch(`${track.baseUrl}/g015.bin`)).arrayBuffer(),
    );
    const actual = document.querySelector<HTMLCanvasElement>(
      '[data-testid="hero-scroll-media"]',
    )!;
    const expected = document.createElement("canvas");
    expected.width = actual.width;
    expected.height = actual.height;
    const context = expected.getContext("2d")!;
    context.imageSmoothingQuality = "high";
    let drawn = false;
    const decoder = new VideoDecoder({
      error: (error) => {
        throw error;
      },
      output: (frame) => {
        if (frame.timestamp === 180) {
          const scale = Math.max(
            actual.width / frame.displayWidth,
            actual.height / frame.displayHeight,
          );
          const w = frame.displayWidth * scale,
            h = frame.displayHeight * scale;
          context.drawImage(
            frame,
            (actual.width - w) / 2,
            (actual.height - h) / 2,
            w,
            h,
          );
          drawn = true;
        }
        frame.close();
      },
    });
    decoder.configure({
      codec: track.codec,
      codedWidth: track.width,
      codedHeight: track.height,
      description: Uint8Array.from(atob(track.description), (c) =>
        c.charCodeAt(0),
      ),
      optimizeForLatency: true,
    });
    let offset = 0;
    for (let index = 180; index < 192; index++) {
      decoder.decode(
        new EncodedVideoChunk({
          type: index === 180 ? "key" : "delta",
          timestamp: index,
          data: bytes.subarray(offset, offset + track.sizes[index]!),
        }),
      );
      offset += track.sizes[index]!;
    }
    await decoder.flush();
    decoder.close();
    if (!drawn) throw new Error("Reference frame not decoded");
    const a = actual
      .getContext("2d")!
      .getImageData(0, 0, actual.width, actual.height).data;
    const b = context.getImageData(0, 0, expected.width, expected.height).data;
    let maximum = 0,
      total = 0;
    for (let i = 0; i < a.length; i++) {
      const delta = Math.abs(a[i]! - b[i]!);
      maximum = Math.max(maximum, delta);
      total += delta;
    }
    expected.width = expected.height = 0;
    return { maximum, mean: total / a.length };
  }, tracks.mobile);
  // GPU and software colour conversion may round channels by one unit.
  expect(difference.maximum).toBeLessThanOrEqual(2);
  expect(difference.mean).toBeLessThan(0.5);
});

test("a speculative decoder flush never blocks already cached reverse frames", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = VideoDecoder.prototype.flush;
    VideoDecoder.prototype.flush = async function () {
      await original.call(this);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("hero-scroll-media")).toHaveAttribute(
    "data-painted",
    "true",
  );
  const scroll = (progress: number) =>
    page.evaluate((progress) => {
      const hero = document.querySelector<HTMLElement>(
        '[data-testid="hero-scroll-video"]',
      )!;
      scrollTo({
        top: (hero.offsetHeight - innerHeight) * progress,
        behavior: "instant",
      });
    }, progress);
  const current = () =>
    page.evaluate(
      () => (window as unknown as AuditedWindow).heroAudit.frames.at(-1)?.index,
    );
  await scroll(0.75);
  await expect.poll(current, { timeout: 15_000 }).toBe(270);
  await scroll(266 / 360);
  await expect.poll(current, { timeout: 10_000 }).toBe(266);
  await scroll(264 / 360);
  await expect.poll(current, { timeout: 750, intervals: [25, 50] }).toBe(264);
});

test("a transient decoder rejection recovers instead of freezing the hero", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const original = VideoDecoder.prototype.decode;
    const flush = VideoDecoder.prototype.flush;
    let rejected = false;
    let flushRejected = false;
    VideoDecoder.prototype.decode = function (chunk) {
      if (!rejected) {
        rejected = true;
        throw new DOMException("Simulated GPU reset", "InvalidStateError");
      }
      original.call(this, chunk);
    };
    VideoDecoder.prototype.flush = function () {
      if (!flushRejected) {
        flushRejected = true;
        return Promise.reject(
          new DOMException("Simulated rejected flush", "AbortError"),
        );
      }
      return flush.call(this);
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("hero-scroll-media")).toHaveAttribute(
    "data-painted",
    "true",
  );
  await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>(
      '[data-testid="hero-scroll-video"]',
    )!;
    scrollTo({
      top: (hero.offsetHeight - innerHeight) * 0.75,
      behavior: "instant",
    });
  });
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as unknown as AuditedWindow).heroAudit.frames.at(-1)?.index,
        ),
      { timeout: 10_000 },
    )
    .toBe(270);
  await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>(
      '[data-testid="hero-scroll-video"]',
    )!;
    scrollTo({
      top: (hero.offsetHeight - innerHeight) * 0.5,
      behavior: "instant",
    });
  });
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as unknown as AuditedWindow).heroAudit.frames.at(-1)?.index,
        ),
      { timeout: 10_000 },
    )
    .toBe(180);
  expect(errors).toEqual([]);
});

test("browsers without pixel-plane copies retain a working reverse canvas fallback", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    VideoFrame.prototype.copyTo = () =>
      Promise.reject(
        new DOMException("Simulated unsupported copy", "NotSupportedError"),
      );
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("hero-scroll-media")).toHaveAttribute(
    "data-painted",
    "true",
  );
  for (const [progress, index] of [
    [0.75, 270],
    [0.5, 180],
    [0.45, 162],
  ] as const) {
    await page.evaluate((progress) => {
      const hero = document.querySelector<HTMLElement>(
        '[data-testid="hero-scroll-video"]',
      )!;
      scrollTo({
        top: (hero.offsetHeight - innerHeight) * progress,
        behavior: "instant",
      });
    }, progress);
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as unknown as AuditedWindow).heroAudit.frames.at(-1)
                ?.index,
          ),
        { timeout: 15_000 },
      )
      .toBe(index);
  }
  expect(errors).toEqual([]);
});

test("cold mobile hero remains usable on a throttled CPU and connection", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "CPU/network emulation requires Chromium CDP; other engines run the same seek regressions natively.",
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  await session.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 100,
    downloadThroughput: 5_000_000 / 8,
    uploadThroughput: 1_000_000 / 8,
  });
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ru", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("hero-scroll-media")).toHaveAttribute(
    "data-painted",
    "true",
    { timeout: 15_000 },
  );
  for (const [progress, index] of [
    [0.75, 270],
    [0.5, 180],
    [0, 0],
  ] as const) {
    await page.evaluate((progress) => {
      const hero = document.querySelector<HTMLElement>(
        '[data-testid="hero-scroll-video"]',
      )!;
      scrollTo({
        top: (hero.offsetHeight - innerHeight) * progress,
        behavior: "instant",
      });
    }, progress);
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window as unknown as AuditedWindow).heroAudit.frames.at(-1)
                ?.index,
          ),
        { timeout: 10_000 },
      )
      .toBe(index);
  }
  expect(errors).toEqual([]);
});
