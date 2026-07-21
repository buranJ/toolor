# Decisions

## D-001 — Backend-neutral commerce boundary

Status: accepted for stage one. Pages use a `CommerceProvider` contract and a typed mock adapter. This keeps the UI portable across WooCommerce, a custom API or another provider.

## D-002 — Server Components by default

Status: accepted. Only local cart interactions and the error boundary are client components. URL-driven catalog state avoids global client state and heavy hydration.

## D-003 — Spreadsheet-backed mock provider

Status: temporary. Product content is generated from the supplied workbook through a typed, read-only import. Availability and unsupported operational fields stay explicit unknowns. The generated JSON can be replaced by a real provider without changing route components.

## D-004 — Device-local cart

Status: temporary. The visible cart uses Zod-validated localStorage records. It has no inventory reservation, customer identity, tax, delivery or cross-device persistence. Provider cart methods are separately implemented in memory for contract validation.

## D-005 — Checkout, wishlist and account skeletons

Status: temporary. Checkout does not submit data or initiate payment. Wishlist is an empty placeholder. Account pages collect no personal data and provide no authentication.

## D-006 — Static motion-ready homepage

Status: accepted for stage one. Semantic sections and a static hero fallback ship now. Motion libraries and assets are deferred and isolated behind a future adapter.

## D-007 — Temporary typography and source imagery

Status: temporary. Geist and system fallbacks stand in for the unprovided brand font. Product imagery uses verified external workbook URLs; unreachable links are filtered into controlled placeholders.

## D-008 — Canonical base

Status: provisional. `https://toolorkg.com` is used as the metadata/sitemap base because it is the supplied current domain. Confirm host and migration policy before deployment.
