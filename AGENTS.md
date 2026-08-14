# TOOLOR repository guide

## Working agreement

- Use `pnpm` (or `corepack pnpm` when pnpm is not installed globally).
- Keep TypeScript strict. Do not introduce `any`; document the exceptional case before using it.
- Default to React Server Components. Add `"use client"` only at an interaction boundary.
- Keep UI independent from the commerce backend. Pages consume `CommerceProvider` through `@/lib/commerce`.
- Treat all current catalog, price, inventory, cart, wishlist, account, checkout, store, legal and contact content as mock or pending verification.
- Never add unverified business claims, addresses, prices, availability, policies, legal details, or sustainability claims.
- Keep homepage content in `src/data` and each homepage section isolated with a `data-scroll-anchor`.
- Never hardcode user-facing copy in a component. Add the key to `src/i18n/messages/ru.json` first, translate it in `en.json` and `ky.json`, then read it via `getDictionary(locale)`.
- Do not add motion libraries, CMS SDKs, ORM, auth, payments, or global state management until the relevant decision is approved.
- Preserve accessibility: semantic landmarks, keyboard support, labels, focus styles, reduced-motion behavior, and useful alt text.
- Before handoff run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. Run Playwright smoke tests when a browser binary is available.

## Architecture boundaries

- `src/lib/commerce/contracts`: backend-neutral interfaces.
- `src/lib/commerce/mock`: typed temporary adapter and fixtures.
- `src/features`: domain behavior and temporary local implementations.
- `src/components`: reusable presentational and interaction components.
- `src/app`: routing, metadata, composition and server data loading.
- `src/data`: editable page content that is not backend data.
- `src/i18n`: locale contract, message dictionaries and routing helpers.

## Languages

Russian (default), English and Kyrgyz. Every route lives under `src/app/[locale]`
and is reachable at `/ru/…`, `/en/…` and `/ky/…`. `src/proxy.ts` redirects
unprefixed paths using the `toolor-locale` cookie, then `Accept-Language`, then
the default.

- **To change a text, edit `src/i18n/messages/{ru,en,ky}.json`** — nothing else.
  `ru.json` defines the shape; a key missing from another locale is a type error,
  so translations cannot silently drift.
- Components receive `locale` and read copy through `getDictionary(locale)`.
  `format()` fills `{placeholders}`; `plural()` applies each language's own CLDR
  rules.
- Build links with `localePath(locale, "/catalog")` so the prefix is never lost.
- **Not translated**, by decision: imported product data (names, descriptions,
  material, care, colours, sizes) and brand marks ("TOOLOR", "Modern nomads",
  "Toolor edit / 01", store names). Category and collection names are storefront
  taxonomy and are translated in `src/lib/commerce/localize.ts`.
- Values that select workbook data (`productType`, `?q=` search terms in
  `src/data/featured-category-mosaic.ts`, the colour keys in
  `src/lib/utils/product-color.ts`) stay Russian — they are data selectors, not
  copy.
- Money formatting is pinned per locale in `src/lib/utils/money.ts`; Kyrgyz
  deliberately reuses the Russian format because browsers lack `ky-KG` currency
  data and would otherwise disagree with the server and break hydration.

Read `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/OPEN_QUESTIONS.md` before changing foundations.
