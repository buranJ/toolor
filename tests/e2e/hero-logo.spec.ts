import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 640 },
]) {
  test(`hero wordmark is centred without a shadow at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/ru", { waitUntil: "domcontentloaded" });
    const layer = page.getByTestId("hero-brand-logo");
    const logo = layer.getByRole("img", { name: "TOOLOR", exact: true });
    await expect(logo).toBeVisible();
    await expect(layer).toHaveCSS("transform", "none");
    await expect(layer.locator(':scope > [aria-hidden="true"]')).toHaveCount(0);
    for (const node of [layer, layer.locator("h1"), logo]) {
      await expect(node).toHaveCSS("filter", "none");
      await expect(node).toHaveCSS("box-shadow", "none");
      await expect(node).toHaveCSS("text-shadow", "none");
    }
    const assertCentred = async () => {
      const bounds = await logo.boundingBox();
      expect(bounds).not.toBeNull();
      expect(
        Math.abs(bounds!.x + bounds!.width / 2 - viewport.width / 2),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(bounds!.y + bounds!.height / 2 - viewport.height / 2),
      ).toBeLessThanOrEqual(1);
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    };
    await assertCentred();
    // Hydration switches media breakpoints; it must not move the wordmark.
    await expect(page.locator(".brand-preloader")).toHaveCount(0);
    await assertCentred();
    await page.screenshot({ path: test.info().outputPath("hero-logo.png") });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.getByTestId("hero-scroll-video")).toHaveAttribute(
      "data-still",
      "true",
    );
    await assertCentred();
  });
}
