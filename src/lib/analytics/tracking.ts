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
  __toolorAnalytics?: { previousUrl?: string };
};

/**
 * Standard vendor queues, loaded after hydration. Initial pageviews are owned
 * by the App Router observer, not both vendor initialization and an effect.
 * Meta's automatic history listener is disabled for the same reason.
 */
export const analyticsBootstrap = `
(function(w,d){
  if(w.__toolorAnalytics)return;
  w.__toolorAnalytics={};
  w.dataLayer=w.dataLayer||[];
  w.gtag=w.gtag||function(){w.dataLayer.push(arguments)};
  function load(src){
    if(Array.prototype.some.call(d.scripts,function(s){return s.src===src}))return;
    var s=d.createElement('script');s.async=true;s.src=src;d.head.appendChild(s);
  }
  w.ym=w.ym||function(){(w.ym.a=w.ym.a||[]).push(arguments)};
  w.ym.l=Date.now();
  w.ym(${analyticsIds.metrika},'init',{
    ssr:true,webvisor:true,clickmap:true,ecommerce:'dataLayer',
    referrer:d.referrer,url:w.location.href,accurateTrackBounce:true,
    trackLinks:true,defer:true
  });
  load('https://mc.yandex.ru/metrika/tag.js?id=${analyticsIds.metrika}');
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
  const referrer = state.previousUrl ?? document.referrer;
  state.previousUrl = url;
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
