import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  analyticsBootstrap,
  analyticsIds,
  metrikaBootstrap,
  trackPageView,
} from "./tracking";

afterEach(() => vi.unstubAllGlobals());

describe("site analytics", () => {
  it("initializes each vendor once and lets Metrika send the first pageview", () => {
    const scripts: { src: string }[] = [];
    const context = {
      window: {
        location: {
          href: "https://toolor.store/ru",
          origin: "https://toolor.store",
          pathname: "/ru",
          search: "",
        },
      },
      document: {
        referrer: "https://example.org/",
        scripts,
        createElement: () => ({ src: "", async: false }),
        getElementsByTagName: () => [
          {
            parentNode: {
              insertBefore: (script: { src: string }) => scripts.push(script),
            },
          },
        ],
        head: {
          appendChild: (script: { src: string }) => scripts.push(script),
        },
      },
      location: {
        href: "https://toolor.store/ru",
        origin: "https://toolor.store",
        pathname: "/ru",
        search: "",
      },
    };
    Object.defineProperty(context, "ym", {
      get: () => (context.window as { ym?: (...args: unknown[]) => void }).ym,
    });
    runInNewContext(metrikaBootstrap, context);
    runInNewContext(metrikaBootstrap, context);
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
      }),
    ]);
    expect(runInNewContext("window.ym.a[0][2].defer", context)).toBeUndefined();
    expect(runInNewContext("window.fbq.disablePushState", context)).toBe(true);
    expect(runInNewContext("Array.from(window.fbq.queue[1])", context)).toEqual(
      ["init", analyticsIds.meta],
    );
    expect(runInNewContext("window.dataLayer[0]", context)).toEqual({
      "gtm.start": expect.any(Number),
      event: "gtm.js",
    });
  });

  it("does not duplicate the initial Metrika view but tracks SPA queries and back", () => {
    const browser = {
      location: {
        origin: "https://toolor.store",
        pathname: "/ru",
        search: "",
        hash: "",
      },
      __toolorAnalytics: { initialUrl: "https://toolor.store/ru" },
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
    expect(browser.ym).not.toHaveBeenCalled();
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
    expect(browser.ym).toHaveBeenCalledTimes(2);
    expect(browser.fbq.mock.calls).toEqual(
      new Array(3).fill(["track", "PageView"]),
    );
  });

  it("tracks a route change that happens before the first observer effect", () => {
    const browser = {
      location: {
        origin: "https://toolor.store",
        pathname: "/ru/catalog",
        search: "",
      },
      __toolorAnalytics: { initialUrl: "https://toolor.store/ru" },
      ym: vi.fn(),
      fbq: vi.fn(),
    };
    vi.stubGlobal("window", browser);
    vi.stubGlobal("document", {
      referrer: "https://example.org/",
      title: "Catalog",
    });

    trackPageView();

    expect(browser.ym).toHaveBeenCalledWith(
      analyticsIds.metrika,
      "hit",
      "https://toolor.store/ru/catalog",
      { referer: "https://toolor.store/ru", title: "Catalog" },
    );
  });

  it("does nothing before bootstrap or with scripts blocked", () => {
    vi.stubGlobal("window", {});
    expect(() => trackPageView()).not.toThrow();
    vi.stubGlobal("window", {
      __toolorAnalytics: { initialUrl: "https://toolor.store/ru" },
      location: { origin: "https://toolor.store", pathname: "/ru", search: "" },
    });
    expect(() => trackPageView()).not.toThrow();
  });
});
