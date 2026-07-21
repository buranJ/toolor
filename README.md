# TOOLOR commerce foundation

Stage-one frontend foundation for the TOOLOR e-commerce experience. It includes a motion-ready static homepage, typed mock commerce provider, catalog/product/search routes, device-local demo cart, account/checkout placeholders, design tokens, documentation and tests.

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
