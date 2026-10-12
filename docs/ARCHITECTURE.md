# Architecture

## Runtime shape

```text
App Router page (server)
        │
        ├── page content from src/data
        ├── CommerceProvider contract
        │       └── MockCommerceProvider today
        │           └── WooCommerce/custom API adapter later
        └── reusable UI and feature components
                └── small client islands only for local interactions
```

Route files own metadata, URL parsing, server data loading and composition. Components do not import mock fixtures directly. Commerce access goes through the backend-neutral `CommerceProvider`; replacing the provider is the intended integration seam.

Business logic belongs in `features` or provider adapters, not presentational components. Runtime validation is used at untrusted boundaries (URL state and browser storage). Server Components are the default; the error boundary, local add-to-cart button and local cart view are deliberate client islands.

Purchase requests use `POST /api/order-requests` (Node runtime). The route limits
and validates the body, rejects cross-origin submissions, and delegates to
`features/checkout`. Product/variant identifiers and expected prices are checked
through `CommerceProvider`; browser-provided product descriptions or prices are
never authoritative. The Telegram transport runs only in the server route and
uses server-only environment variables. With the approved Netlify storage driver,
`features/orders` saves immutable request snapshots, workflow status and audit
history in private site-wide Netlify Blobs. Its conditional storage contract is
backend-neutral; a future self-hosted adapter can replace the Netlify adapter.
`POST /api/telegram/webhook` validates a shared secret and the one authorized
private Telegram account before reading or changing orders. These are purchase
requests, not payments, inventory reservations or confirmed commercial orders. See
`docs/TELEGRAM_CHECKOUT.md` for setup and remaining launch requirements.

Homepage sections remain content-first and semantic. They expose stable `data-scroll-anchor` values. The hero isolates its scroll-driven WebCodecs player behind `FrameSource`, with a bounded still-image fallback and a static poster for reduced motion/Data Saver. It uses native browser APIs, not an animation library; see `docs/HERO_DELIVERY.md` for network and decoded-frame budgets.

## Error and cache policy

Missing products/categories use Next.js `notFound()`. Provider errors propagate to the route error boundary. Cache/revalidation semantics are deferred until a real backend describes freshness requirements; the in-memory mock is deterministic and process-local.

## Canonical and indexing strategy

The current public domain supplied by the user, `https://toolor.store`, is the metadata, sitemap and robots base. Every public route declares a clean path-only canonical; query-based filtering and sorting canonicalize to the unfiltered catalog route. Search, cart, checkout, wishlist and account routes are excluded from indexing. Any future host migration and legacy redirect map still require an explicit decision.
