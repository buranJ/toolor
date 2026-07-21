# TOOLOR repository guide

## Working agreement

- Use `pnpm` (or `corepack pnpm` when pnpm is not installed globally).
- Keep TypeScript strict. Do not introduce `any`; document the exceptional case before using it.
- Default to React Server Components. Add `"use client"` only at an interaction boundary.
- Keep UI independent from the commerce backend. Pages consume `CommerceProvider` through `@/lib/commerce`.
- Treat all current catalog, price, inventory, cart, wishlist, account, checkout, store, legal and contact content as mock or pending verification.
- Never add unverified business claims, addresses, prices, availability, policies, legal details, or sustainability claims.
- Keep homepage content in `src/data` and each homepage section isolated with a `data-scroll-anchor`.
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

Read `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/OPEN_QUESTIONS.md` before changing foundations.
