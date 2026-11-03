# Analytics integration — 2026-11-02

Owner-supplied identifiers: Yandex Metrica `113868680`, Meta Pixel
`1210121161991189`, Google Tag Manager `GTM-MDMS6X7F`.

The locale layout installs one `next/script` bootstrap after hydration, inside
a local Suspense boundary, on all localized routes. Development (`pnpm dev`)
does not load analytics; production builds do. No SDK/dependency is added.
Noscript image/iframe fallbacks are server-rendered only in production.

Metrica retains the requested SSR, Webvisor, clickmap, ecommerce `dataLayer`,
link and bounce settings. `defer: true` disables its automatic first hit;
the route observer sends exactly one `hit` per current pathname/query, including
the first page, browser back and language changes. Hash-only navigation does
not count again. Meta's automatic pushState PageView is disabled because the
same observer sends PageView. Automatic configuration is disabled; no advanced
matching/customer fields or automatic purchase events are configured here.

GTM uses its standard `gtm.start` / `gtm.js` initialization (missing in the
provided fragment). The supplied `gtag('js', new Date())` queue is retained.
`gtag` alone does not install GA4: no GA4 measurement ID was supplied.
`toolor_page_view` events contain URL, previous URL/referrer and page title.
No cart, contact, address or Telegram order payloads enter the dataLayer.
The `ecommerce` option listens for future dataLayer ecommerce events; it does
not implement add-to-cart/purchase tracking. Purchase requests are not payments.

## SEO team checks before publication

- Do not install these same Metrica/Meta IDs again in GTM. The site's local
  deduplication cannot prevent duplication introduced by container tags.
- Configure/publish the GTM container. Choose one GA4 page-view approach:
  `toolor_page_view` trigger OR automatic/history tracking, not both.
- Verify received events in Metrica, Meta Test Events and GTM Preview. A loaded
  script does not prove dashboard receipt; blockers can suppress analytics.
- Approve the privacy notice/consent approach for the intended markets. There
  is currently no analytics consent banner/CMP. These requested tags start in
  production without a consent gate; the checkout Telegram checkbox is NOT
  analytics consent. No legal text or compliance claim has been invented.
- The checkout form has Metrica's `ym-hide-content ym-disable-submit` classes
  to hide its content/input values from Session Replay/form analytics. Keep
  “Record all fields” off and review any GTM/Meta automatic collection rules
  in the vendor dashboards. This markup is not a universal third-party DLP.

References: [Next Script](https://nextjs.org/docs/app/guides/scripts),
[Metrica initialization](https://yandex.com/support/metrica/en/code/counter-initialize),
[Metrica markup](https://yandex.ru/support/metrica/en/code/html-markup),
[Meta SPA tracking](https://developers.facebook.com/docs/meta-pixel/implementation/tag_spa),
[GTM installation](https://support.google.com/tagmanager/answer/14847097).
