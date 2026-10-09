/** Measure visible frame cadence at animation ticks, not decoder callbacks.
 * Run against a production server: pnpm hero:audit
 * Optional HERO_AUDIT_URL, HERO_AUDIT_BROWSER, HERO_AUDIT_MODE,
 * HERO_AUDIT_DURATION_MS. Results are laboratory observations, not field FPS.
 */
import { chromium, firefox, webkit } from "@playwright/test";
import tracks from "../src/data/hero-tracks.json";

type AuditState = {
  index: number;
  submissions: number;
  decodes: number;
  flushes: number;
  configurations: number;
};
type AuditWindow = Window & { heroMotionAudit: AuditState };
const engines = { chromium, webkit, firefox };
const baseURL = process.env.HERO_AUDIT_URL ?? "http://localhost:3100";
const duration = Number(process.env.HERO_AUDIT_DURATION_MS ?? 5000);

async function main() {
  for (const [name, engine] of Object.entries(engines)) {
    if (
      process.env.HERO_AUDIT_BROWSER &&
      process.env.HERO_AUDIT_BROWSER !== name
    )
      continue;
    const browser = await engine.launch();
    try {
      for (const mode of ["mobile", "desktop"] as const) {
        if (process.env.HERO_AUDIT_MODE && process.env.HERO_AUDIT_MODE !== mode)
          continue;
        const page = await browser.newPage({
          locale: "ru-RU",
          deviceScaleFactor: mode === "mobile" ? 3 : 2,
          viewport:
            mode === "mobile"
              ? { width: 390, height: 844 }
              : { width: 1440, height: 900 },
        });
        // tsx/esbuild keeps function names using this identity helper, including
        // inside callbacks serialized by Playwright into the browser realm.
        await page.addInitScript("globalThis.__name = (value) => value");
        await page.addInitScript(() => {
          const state: AuditState = {
            index: -1,
            submissions: 0,
            decodes: 0,
            flushes: 0,
            configurations: 0,
          };
          (window as unknown as AuditWindow).heroMotionAudit = state;
          const indices = new WeakMap<CanvasImageSource, number>();
          const draw = CanvasRenderingContext2D.prototype.drawImage;
          CanvasRenderingContext2D.prototype.drawImage = function (
            image: CanvasImageSource,
            ...args: number[]
          ) {
            Reflect.apply(draw, this, [image, ...args]);
            const index =
              typeof VideoFrame !== "undefined" && image instanceof VideoFrame
                ? image.timestamp
                : indices.get(image);
            if (index === undefined) return;
            indices.set(this.canvas, index);
            if (
              this.canvas instanceof HTMLCanvasElement &&
              this.canvas.dataset.testid === "hero-scroll-media"
            ) {
              state.index = index;
              state.submissions++;
            }
          };
          if (typeof VideoDecoder !== "undefined") {
            const decode = VideoDecoder.prototype.decode;
            VideoDecoder.prototype.decode = function (chunk) {
              state.decodes++;
              decode.call(this, chunk);
            };
            const flush = VideoDecoder.prototype.flush;
            VideoDecoder.prototype.flush = function () {
              state.flushes++;
              return flush.call(this);
            };
            const configure = VideoDecoder.prototype.configure;
            VideoDecoder.prototype.configure = function (config) {
              state.configurations++;
              configure.call(this, config);
            };
          }
        });
        // Headless engines can have different rAF limits. A blank-page
        // control prevents reporting that limit as a hero regression.
        await page.goto("about:blank");
        const baselineTicks = await page.evaluate(
          () =>
            new Promise<number>((resolve) => {
              let count = 0;
              const start = performance.now();
              const tick = (now: number) => {
                if (now - start < 1000) {
                  count++;
                  requestAnimationFrame(tick);
                } else resolve(count);
              };
              requestAnimationFrame(tick);
            }),
        );
        await page.goto(`${baseURL}/ru`, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() =>
          document.querySelector(
            '[data-testid="hero-scroll-media"][data-painted="true"]',
          ),
        );
        await page.locator(".brand-preloader").waitFor({ state: "detached" });
        for (const direction of ["forward", "backward"] as const) {
          const result = await page.evaluate(
            async ({ direction, duration, count }) => {
              const state = (window as unknown as AuditWindow).heroMotionAudit;
              const hero = document.querySelector<HTMLElement>(
                '[data-testid="hero-scroll-video"]',
              )!;
              const end = hero.offsetHeight - innerHeight - 1;
              const from = direction === "forward" ? 0 : end;
              const to = direction === "forward" ? end : 0;
              scrollTo({ top: from, behavior: "instant" });
              await new Promise((resolve) => setTimeout(resolve, 700));
              state.submissions = state.decodes = 0;
              state.flushes = state.configurations = 0;
              const samples: { at: number; index: number; lag: number }[] = [];
              const start = performance.now();
              await new Promise<void>((resolve) => {
                const tick = (now: number) => {
                  const elapsed = now - start;
                  const progress = Math.min(1, elapsed / duration);
                  scrollTo({
                    top: from + (to - from) * progress,
                    behavior: "instant",
                  });
                  // The CSS playhead includes intentional scroll easing. Compare
                  // that with the canvas to separate decoder lag from easing.
                  const requested =
                    Number(hero.style.getPropertyValue("--hero-progress")) *
                    (count - 1);
                  if (elapsed <= duration)
                    samples.push({
                      at: elapsed,
                      index: state.index,
                      lag: Math.abs(requested - state.index),
                    });
                  if (elapsed < duration + 700) requestAnimationFrame(tick);
                  else resolve();
                };
                requestAnimationFrame(tick);
              });
              const updates = samples.filter(
                (sample, i) =>
                  i === 0 || sample.index !== samples[i - 1]!.index,
              );
              const gaps = updates
                .slice(1)
                .map((sample, i) => sample.at - updates[i]!.at)
                .sort((a, b) => a - b);
              const lags = samples
                .map((sample) => sample.lag)
                .sort((a, b) => a - b);
              const percentile = (values: number[], at: number) =>
                Number(
                  (
                    values[
                      Math.min(
                        values.length - 1,
                        Math.floor(values.length * at),
                      )
                    ] ?? 0
                  ).toFixed(1),
                );
              return {
                refreshTicks: samples.length,
                visibleUpdates: updates.length,
                visibleGapP95Ms: percentile(gaps, 0.95),
                visibleGapMaxMs: percentile(gaps, 1),
                decoderLagP95Frames: percentile(lags, 0.95),
                submissions: state.submissions,
                decodes: state.decodes,
                flushes: state.flushes,
                configurations: state.configurations,
                finalIndex: state.index,
              };
            },
            { direction, duration, count: tracks[mode].sizes.length },
          );
          process.stdout.write(
            `${JSON.stringify({ browser: name, mode, direction, duration, baselineTicksPerSecond: baselineTicks, ...result })}\n`,
          );
        }
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
