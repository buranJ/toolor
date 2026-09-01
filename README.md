# TOOLOR

Frontend foundation for the TOOLOR storefront: catalog, product, search and checkout routes,
a device-local cart, a backend-neutral commerce contract, three locales, and unit + end-to-end tests.

Stage one of the project — the UI, the data contracts and the test harness are real; the commerce
backend behind them is still a typed mock.

## Overview

The goal of this stage was to build a storefront that can be pointed at a real commerce backend
later without rewriting the pages. Every read of product, category or search data goes through a
single `CommerceProvider` contract; today the only implementation is an in-memory mock built from
an imported product workbook, and swapping in a WooCommerce or custom API adapter is meant to be
the one change that makes the store live.

Everything user-visible is content-first and server-rendered by default. Client components exist
only where a local interaction requires them — the add-to-cart button, the local cart view and the
error boundary.

No product, price, inventory or store record in this repository should be treated as verified
business data.

## Features

- **Catalog** — category routes, product detail pages, search, all server-rendered
- **Cart and wishlist** — device-local, validated at the storage boundary
- **Checkout and account** — profile, orders and addresses routes (placeholders pending a backend)
- **Commerce contract** — `CommerceProvider` interface with a typed mock implementation;
  the intended integration seam for a real backend
- **Product import** — a script that reads the source workbook, validates it against a Zod schema
  and reports what it found (`products:inspect`, `products:import`)
- **Three locales** — Russian (default), English and Kyrgyz, served from `/ru/…`, `/en/…`, `/ky/…`.
  Unprefixed URLs redirect to the visitor's saved choice, then `Accept-Language`, then Russian.
  All copy lives in `src/i18n/messages/*.json`; if a locale is missing a key, `typecheck` fails,
  so the three files cannot drift apart.
- **Content pages** — about, delivery, returns, stores, sustainability
- **Motion contract without a motion runtime** — the hero declares `data-motion-slot` and a static
  poster/fallback, so animation can be added later without touching layout
- **Tests** — Vitest unit tests for cart, money, i18n, validation and the mock provider;
  Playwright end-to-end specs for the store and locale routing
- **Documented design system** — tokens, accessibility notes and a performance budget in `docs/`

## Architecture

```
App Router page (server component)
        │
        ├── page content            src/data
        ├── CommerceProvider        src/lib/commerce/contracts
        │       └── MockCommerceProvider (today)
        │           └── real API adapter (later — same contract)
        ├── i18n messages           src/i18n/messages/{ru,en,ky}.json
        └── UI + feature components
                └── small client islands only for local interactions
                        └── local cart / wishlist in browser storage
```

Route files own metadata, URL parsing, server data loading and composition. Components never import
mock fixtures directly. Business logic lives in `src/features` or in provider adapters, not in
presentational components. Runtime validation with Zod is applied at untrusted boundaries — URL
state and browser storage.

Missing products and categories use Next.js `notFound()`; provider errors propagate to the route
error boundary. Cache and revalidation semantics are deliberately deferred until a real backend
describes its freshness requirements.

## Tech Stack

### Frontend
- Next.js (App Router, React Server Components)
- React, TypeScript
- Tailwind CSS v4
- Zod — runtime validation at untrusted boundaries

### Data
- `CommerceProvider` contract with an in-memory mock provider
- Product import from an Excel workbook via `exceljs` + a Zod product schema

### Testing
- Vitest + Testing Library + jsdom (unit / component)
- Playwright (end-to-end, including locale routing)

### Infrastructure
- Netlify — with explicit cache headers for `/media/*` and `/fonts/*`
- ESLint, Prettier (+ `prettier-plugin-tailwindcss`), `tsc --noEmit`

## Project Structure

```
src/
  app/[locale]/
    (store)/        home, catalog, product, search, cart, checkout, wishlist, account
    about, delivery, returns, stores, sustainability
  components/       product, catalog, cart, checkout, account, sections, layout,
                    navigation, media, ui
  features/         cart, wishlist — local state and its tests
  i18n/             messages/{ru,en,ky}.json + resolution logic
  lib/
    commerce/       contracts, mock provider, importers, localisation
    config/ utils/ validation/
  data/ types/ test/
tests/e2e/          Playwright specs
docs/               ARCHITECTURE, DECISIONS, DESIGN_SYSTEM, ACCESSIBILITY,
                    PERFORMANCE_BUDGET, COMMERCE_MODEL, SCOPE, OPEN_QUESTIONS, …
scripts/            product import
media-src/          source media before encoding
```

## Getting Started

Requirements: Node.js 20+, pnpm (via corepack).

```bash
corepack pnpm install
corepack pnpm dev
```

Open the local URL printed by Next.js. There are no environment variables to set — the mock
provider is process-local and deterministic.

## Development

```bash
corepack pnpm dev
corepack pnpm products:inspect     # read and validate the product workbook, report findings
corepack pnpm products:import      # write the imported catalog
corepack pnpm format
```

## Tests

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test          # Vitest
corepack pnpm build
corepack pnpm test:e2e      # Playwright
```

`typecheck` is also the i18n guard: a missing key in `en.json` or `ky.json` fails the build.

## Deployment

Netlify. `netlify.toml` sets cache headers explicitly: `/media/*` gets a one-day max-age with a
week of `stale-while-revalidate` (the scroll-driven hero video was re-fetched on every load
otherwise), and `/fonts/*` is immutable for a year. Media is deliberately *not* immutable —
hero assets keep their filenames across re-encodes.

## Screenshots

_To add: homepage hero, catalog, product page._

## Current Status

Stage one, active development. The UI, commerce contract, i18n and test harness are in place;
the commerce backend is a mock. Read `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` and
`docs/OPEN_QUESTIONS.md` before replacing the mock systems.
