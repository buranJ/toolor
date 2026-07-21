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

Homepage sections remain content-first and semantic. They expose stable `data-scroll-anchor` values. The hero declares a `data-motion-slot` and static poster/fallback contract, but no animation runtime is loaded.

## Error and cache policy

Missing products/categories use Next.js `notFound()`. Provider errors propagate to the route error boundary. Cache/revalidation semantics are deferred until a real backend describes freshness requirements; the in-memory mock is deterministic and process-local.

## Canonical and indexing strategy

The supplied current domain, `https://toolorkg.com`, is the provisional metadata base. Every public route declares a clean path-only canonical; query-based filtering and sorting canonicalize to the unfiltered catalog route. Search, cart, checkout, wishlist and account routes are excluded from indexing. Confirm the final host, locale strategy and legacy redirect map before deployment.
