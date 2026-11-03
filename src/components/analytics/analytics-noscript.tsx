import { analyticsIds } from "@/lib/analytics/tracking";

/** Vendor fallbacks run only when JavaScript is disabled. */
export function AnalyticsNoscript() {
  return (
    <noscript>
      <div aria-hidden="true">
        {/* These are tracking endpoints, not display images to optimize. */}
        {/* eslint-disable @next/next/no-img-element */}
        <img
          src={`https://mc.yandex.ru/watch/${analyticsIds.metrika}`}
          style={{ position: "absolute", left: -9999 }}
          width="1"
          height="1"
          alt=""
        />
        <img
          src={`https://www.facebook.com/tr?id=${analyticsIds.meta}&ev=PageView&noscript=1`}
          style={{ display: "none" }}
          width="1"
          height="1"
          alt=""
        />
        {/* eslint-enable @next/next/no-img-element */}
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${analyticsIds.gtm}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
          tabIndex={-1}
        />
      </div>
    </noscript>
  );
}
