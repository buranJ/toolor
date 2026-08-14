# TOOLOR commerce foundation

Stage-one frontend foundation for the TOOLOR e-commerce experience. It includes a motion-ready static homepage, typed mock commerce provider, catalog/product/search routes, device-local demo cart, account/checkout placeholders, design tokens, documentation and tests.

## Languages

The storefront ships in Russian (default), English and Kyrgyz, served from
`/ru/…`, `/en/…` and `/ky/…`. Unprefixed URLs redirect to the visitor's saved
choice, otherwise to their `Accept-Language`, otherwise to Russian.

**All interface copy lives in `src/i18n/messages/ru.json`, `en.json` and
`ky.json`.** To change a wording, edit those files — no component changes are
needed. `ru.json` is the source shape: if another locale is missing a key,
`pnpm typecheck` fails, so the three files cannot drift apart.

Product data imported from the workbook (names, descriptions, materials,
colours) and brand marks stay in their source language on every locale by
design. See `AGENTS.md` for the full contract.

## Local development

```bash
corepack pnpm install
corepack pnpm dev
```

Open the local URL printed by Next.js.

## Quality checks

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```

Read `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` and `docs/OPEN_QUESTIONS.md` before replacing mock systems. No current product, price, inventory, policy or store record in the repository should be treated as verified business data.
