/** Public identifiers supplied by the site's SEO team; these are not secrets. */
export const analyticsIds = {
  metrika: 113868680,
  meta: "1210121161991189",
  gtm: "GTM-MDMS6X7F",
} as const;

type TrackingFunction = (...args: unknown[]) => void;
type AnalyticsWindow = Window & {
  ym?: TrackingFunction;
  fbq?: TrackingFunction;
  dataLayer?: unknown[];
  __toolorAnalytics?: { initialUrl: string; previousUrl?: string };
};

/**
 * Rendered in the locale root layout's initial HTML. The vendor snippet is
 * intentionally kept here, rather than injected after hydration, so Metrika
 * can initialize Webvisor as the document loads and can be found in View Source.
 */
export const metrikaBootstrap = `
if (!window.__toolorAnalytics) {
  window.__toolorAnalytics = {
    initialUrl: location.origin + location.pathname + location.search
  };
  (function(m,e,t,r,i,k,a){
      m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
  })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=${analyticsIds.metrika}', 'ym');

  ym(${analyticsIds.metrika}, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
}
`;

/** Meta and GTM can wait until hydration; Metrika's first hit is automatic. */
export const analyticsBootstrap = `
(function(w,d){
  if(w.__toolorMarketing)return;
  w.__toolorMarketing=true;
  w.dataLayer=w.dataLayer||[];
  w.gtag=w.gtag||function(){w.dataLayer.push(arguments)};
  function load(src){
    if(Array.prototype.some.call(d.scripts,function(s){return s.src===src}))return;
    var s=d.createElement('script');s.async=true;s.src=src;d.head.appendChild(s);
  }
  if(!w.fbq){
    var n=w.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!w._fbq)w._fbq=n;
    n.push=n;n.loaded=true;n.version='2.0';n.queue=[];
  }
  w.fbq.disablePushState=true;
  w.fbq('set','autoConfig',false,'${analyticsIds.meta}');
  w.fbq('init','${analyticsIds.meta}');
  load('https://connect.facebook.net/en_US/fbevents.js');
  w.dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
  w.gtag('js',new Date());
  load('https://www.googletagmanager.com/gtm.js?id=${analyticsIds.gtm}');
})(window,document);
`;

/** No cart, contact, address or purchase payloads are sent by this integration. */
export function trackPageView() {
  const browser = window as AnalyticsWindow;
  const state = browser.__toolorAnalytics;
  if (!state) return;
  const url =
    browser.location.origin +
    browser.location.pathname +
    browser.location.search;
  if (state.previousUrl === url) return;
  const isInitialView =
    state.previousUrl === undefined && state.initialUrl === url;
  const referrer =
    state.previousUrl ?? (isInitialView ? document.referrer : state.initialUrl);
  state.previousUrl = url;
  if (!isInitialView)
    browser.ym?.(analyticsIds.metrika, "hit", url, {
      referer: referrer,
      title: document.title,
    });
  browser.fbq?.("track", "PageView");
  // This is a routing signal, not a second automatic GA4 page_view. The GTM
  // owner chooses either this custom trigger or GA4 enhanced/history tracking.
  browser.dataLayer?.push({
    event: "toolor_page_view",
    page_location: url,
    page_referrer: referrer,
    page_title: document.title,
  });
}
