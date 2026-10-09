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

Status: updated on 2026-10-08 after the user's approval of Telegram purchase
requests. Checkout sends contact/delivery details and server-resolved catalogue
lines to a server-configured Telegram recipient, only with explicit customer
consent. No payment is collected, stock reserved or commercial order confirmed.
Missing credentials fail closed without clearing the cart. Durable storage,
distributed abuse prevention and the receiving private chat/group still need
configuration/approval; see `docs/TELEGRAM_CHECKOUT.md`. Wishlist is an empty
placeholder. Account pages collect no personal data and provide no authentication.

## D-006 — Isolated native homepage motion

Status: updated after the approved hero implementation. Semantic sections and a static poster remain the fallback contract. The scroll-driven hero uses native WebCodecs/canvas behind a `FrameSource` adapter, with no motion library. Decoded frames and speculative requests are bounded; offscreen/background playback pauses. Reduced motion and Data Saver keep the poster and visible content.

## D-007 — Temporary typography and source imagery

Status: temporary. Geist and system fallbacks stand in for the unprovided brand font. Product imagery uses verified external workbook URLs; unreachable links are filtered into controlled placeholders.

## D-008 — Canonical base

Status: updated on 2026-10-08. `https://toolor.store` is the current public site supplied by the user and is used consistently for metadata, sitemap and robots. A different production host or redirect migration requires confirmation; the earlier provisional `toolorkg.com` base is no longer used.
