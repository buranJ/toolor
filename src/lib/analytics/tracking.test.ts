import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";

import { analyticsBootstrap, analyticsIds, trackPageView } from "./tracking";

afterEach(() => vi.unstubAllGlobals());

describe("site analytics", () => {
  it("initializes each vendor once with the supplied IDs and deferred pageviews", () => {
    const scripts: { src: string }[] = [];
    const context = {
      window: { location: { href: "https://toolor.store/ru" } },
      document: {
        referrer: "https://example.org/",
        scripts,
        createElement: () => ({ src: "", async: false }),
        head: {
          appendChild: (script: { src: string }) => scripts.push(script),
        },
      },
    };
    runInNewContext(analyticsBootstrap, context);
    runInNewContext(analyticsBootstrap, context);
    expect(scripts.map((script) => script.src)).toEqual([
      `https://mc.yandex.ru/metrika/tag.js?id=${analyticsIds.metrika}`,
      "https://connect.facebook.net/en_US/fbevents.js",
      `https://www.googletagmanager.com/gtm.js?id=${analyticsIds.gtm}`,
    ]);
    expect(runInNewContext("Array.from(window.ym.a[0])", context)).toEqual([
      analyticsIds.metrika,
      "init",
      expect.objectContaining({
        webvisor: true,
        clickmap: true,
        ssr: true,
        ecommerce: "dataLayer",
        accurateTrackBounce: true,
        trackLinks: true,
        defer: true,
      }),
    ]);
    expect(runInNewContext("window.fbq.disablePushState", context)).toBe(true);
    expect(runInNewContext("Array.from(window.fbq.queue[1])", context)).toEqual(
      ["init", analyticsIds.meta],
    );
    expect(runInNewContext("window.dataLayer[0]", context)).toEqual({
      "gtm.start": expect.any(Number),
      event: "gtm.js",
    });
  });

  it("tracks the first view, SPA queries and back without duplicate effects or hash hits", () => {
    const browser = {
      location: {
        origin: "https://toolor.store",
        pathname: "/ru",
        search: "",
        hash: "",
      },
      __toolorAnalytics: {},
      ym: vi.fn(),
      fbq: vi.fn(),
      dataLayer: [] as unknown[],
    };
    vi.stubGlobal("window", browser);
    vi.stubGlobal("document", {
      referrer: "https://example.org/",
      title: "TOOLOR",
    });
    trackPageView();
    trackPageView();
    browser.location.hash = "#collection";
    trackPageView();
    expect(browser.ym).toHaveBeenCalledTimes(1);
    expect(browser.ym).toHaveBeenLastCalledWith(
      analyticsIds.metrika,
      "hit",
      "https://toolor.store/ru",
      {
        referer: "https://example.org/",
        title: "TOOLOR",
      },
    );
    browser.location.pathname = "/ru/catalog";
    browser.location.search = "?page=2";
    trackPageView();
    expect(browser.dataLayer[1]).toEqual({
      event: "toolor_page_view",
      page_location: "https://toolor.store/ru/catalog?page=2",
      page_referrer: "https://toolor.store/ru",
      page_title: "TOOLOR",
    });
    browser.location.pathname = "/ru";
    browser.location.search = "";
    trackPageView();
    expect(browser.ym).toHaveBeenCalledTimes(3);
    expect(browser.fbq.mock.calls).toEqual(
      new Array(3).fill(["track", "PageView"]),
    );
  });

  it("does nothing before bootstrap or with scripts blocked", () => {
    vi.stubGlobal("window", {});
    expect(() => trackPageView()).not.toThrow();
    vi.stubGlobal("window", {
      __toolorAnalytics: {},
      location: { origin: "https://toolor.store", pathname: "/ru", search: "" },
    });
    expect(() => trackPageView()).not.toThrow();
  });
});
