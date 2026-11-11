# Decisions

## D-001 — Backend-neutral commerce boundary

Status: accepted for stage one. Pages use a `CommerceProvider` contract and a typed mock adapter. This keeps the UI portable across WooCommerce, a custom API or another provider.

## D-002 — Server Components by default

Status: accepted. Only local cart interactions and the error boundary are client components. URL-driven catalog state avoids global client state and heavy hydration.

## D-003 — Spreadsheet-backed mock provider

Status: temporary. Product content is generated from the supplied workbook through a typed, read-only import. Availability and unsupported operational fields stay explicit unknowns. The generated JSON can be replaced by a real provider without changing route components.

Updated on 2026-10-14 for the owner-requested full catalog replacement from
`marketplace_catalog.xlsx`: 49 source groups / 494 variants, with no completeness
threshold that could hide a valid source group. Named sheets provide gender
fallbacks; unisex clothing has a localized category. Empty source prices carry
`priceStatus: unknown` (amount 0 is an internal sentinel only), display a translated
price-on-request label, sort after priced items and cannot enter cart/checkout.
Store-specific stock is not a verified promise of availability. The source stays
private/read-only; see `PRODUCT_IMPORT_REPORT.md` for provenance and reproduction.

## D-004 — Device-local cart

Status: temporary. The visible cart uses Zod-validated localStorage records. It has no inventory reservation, customer identity, tax, delivery or cross-device persistence. Provider cart methods are separately implemented in memory for contract validation.

## D-005 — Checkout, wishlist and account skeletons

Status: updated on 2026-10-08 after the user's approval of Telegram purchase
requests. Checkout sends contact/delivery details and server-resolved catalogue
lines to a server-configured Telegram recipient, only with explicit customer
consent. No payment is collected, stock reserved or commercial order confirmed.
Missing credentials fail closed without clearing the cart. On 2026-10-12 the user
approved persistent order history on Netlify and processing by one employee,
entirely within Telegram. Netlify Blobs uses a private production namespace and
conditional writes; bot buttons allow new → working → shipped → completed, plus
confirmed cancellation before shipment. Access is restricted to the configured
private chat and operator ID. On 2026-10-13 the owner requested an additional
employee: an explicit private-account allowlist now supports shared history and
workflow changes without opening group/public access. Checkout notifications
still have one primary recipient; additional staff open cards through /orders.
No ORM, general customer auth or payment SDK is added.
On 2026-10-13, preparation for the user-requested company-PC migration added a
Node 24 built-in SQLite adapter (no ORM/dependency), offline export/import and
backup tooling. Production remains on Netlify; final host validation and cutover
are pending. Retention/deletion rules and distributed abuse protection remain
open; see `docs/TELEGRAM_CHECKOUT.md` and `docs/SELF_HOSTED_MIGRATION.md`. Wishlist is an empty
placeholder. Account pages collect no personal data and provide no authentication.

## D-006 — Isolated native homepage motion

Status: updated after the approved hero implementation. Semantic sections and a static poster remain the fallback contract. The scroll-driven hero uses native WebCodecs/canvas behind a `FrameSource` adapter, with no motion library. Decoded frames and speculative requests are bounded; offscreen/background playback pauses. Reduced motion and Data Saver keep the poster and visible content.

## D-007 — Temporary typography and source imagery

Status: temporary. Geist and system fallbacks stand in for the unprovided brand font. Product imagery uses verified external workbook URLs; unreachable links are filtered into controlled placeholders.

Updated on 2026-10-14: the replacement catalog's 448 source photos are downloaded,
decoded and stored as local high-quality WebP assets. Signed supplier URLs are
never included in browser payloads or the import report. Next Image provides
responsive delivery. Alternate card photos mount only after mouse/keyboard
interaction, with the primary retained until the alternate loads. Missing source
photos stay placeholders; no replacement imagery is fabricated.

## D-008 — Canonical base

Status: updated on 2026-10-08. `https://toolor.store` is the current public site supplied by the user and is used consistently for metadata, sitemap and robots. A different production host or redirect migration requires confirmation; the earlier provisional `toolorkg.com` base is no longer used.

## D-009 — Owner-only Netlify catalog console

Status: approved by the owner on 2026-11-02. `/admin` accepts a production-only
password secret. Workbook uploads create a draft and require an explicit final
publish action. Catalog versions, photo assets and ordering persist in Netlify
Blobs; the first six priority products feed the homepage selection. No CMS SDK,
ORM, general customer authentication or payment system is introduced. The
preexisting bundled catalog remains a fallback until an owner publishes an
import. Source photo URLs remain private and are localized before publication.
The initial release has one admin password, not per-person accounts or roles.
