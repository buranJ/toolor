# Design audit (Claude)

Audit of the existing TOOLOR commerce frontend against the reference images in
`docs/references/` and the Modern Nomad / Technical Fashion brief. The
architecture, commerce data, cart logic, filters, tests, SEO and future motion
slot are functional and are preserved. This document records only the visual and
UX gaps and the plan to close them.

## Reference reading (primary source: the actual images)

| Ref | What it is | Principles taken | Rejected / not copied | Influences |
| --- | --- | --- | --- | --- |
| `1.jpg` | Apparel PDP (VELORA) | 60/40 media-to-panel, thumbnail rail, name→price→color→size→action order, size-guide adjacency, detail-crop break, related row | Ratings, review counts, sale strikethrough, discount badges, heavy rounded cards, boxed reassurance icons | Product page, cart line media, related row |
| `2.jpg` | Fashion homepage (LUNORA) | Editorial split hero, alternation of lifestyle and product modules, calm consistent product crops, newsletter→footer closure | Circular category icons, luxury serif, ratings, promo bubbles, equal-weight module grid, floating white cards | Homepage rhythm, footer |
| `3.jpg` | Nature poster ("NATURE") | Small human against vast landscape, layered haze, calm natural palette, sparse route/coordinate metadata, negative space with purpose | Rotated composition, giant vertical type, scattered microcopy, olive as brand colour, IG-poster framing | Hero, Modern Nomads, Community |
| `4.jpg` | Fashion homepage (Wink) | Dark image-led hero, bold grotesk headline, quiet product cards with name/price/wishlist, category filter row | Excess rounded containers, stacked floating cards | Hero, catalog cards |
| `5.jpg` | Mountain tour site (H·I DRIVE) | Landscape scale, torn mountain-silhouette mask edge, cold blue-grey atmosphere, route/tour cadence | Poster clutter, decorative photo frame | Modern Nomads, section transitions |
| `6.jpg` | Rejected current-style board | — (negative reference) | Decorative blobs, distorted display type, teal gradients, cluttered collage | What to avoid everywhere |

## Cross-cutting findings

- **Gray-placeholder problem (critical).** Editorial sections (`FeaturedCollection`,
  `ModernNomads`, `Community`, `Sustainability`, `FeaturedProducts` supporting row)
  feed `ResilientEditorialImage` a *slice* of a product's images
  (`images.slice(1)` / `.slice(2)`). Products with 1–3 images produce an **empty
  array → bare `bg-stone`/`bg-ink` block**. On the live homepage several full-bleed
  sections render as large empty grey rectangles. This is exactly the
  "grey geometric placeholder / AI-generated" weakness the brief calls out.
- **Editorial media depends on photography Toolor does not have.** References use
  dedicated lifestyle/landscape shots; Toolor only has product photos (some are
  baked marketing graphics). Large surfaces must therefore be **type-, colour- and
  graphic-led with one reliable image**, never a multi-image slice that can empty.
- **Typography lacks a premium system.** One-off `text-*` sizes per section, no
  shared display/heading/label scale, generic tracking. Reads as a Tailwind
  template rather than an art-directed brand.
- **Buttons/links are generic bordered pills.** `min-h-11 border px-5` on every
  action; weak hierarchy between primary and secondary.
- **Blue is under-used as identity, over-used as a flat fill.** Brief wants blue as
  a controlled accent with clear intent (primary action, route markers, active).

## Per-page audit

### Homepage — `src/app/(store)/page.tsx` + `components/sections/*`

| Item | Severity | Preserve | Improve / Remove |
| --- | --- | --- | --- |
| Hero (`hero/hero-section.tsx`) | **critical** | `HeroMotionSlot`, `data-motion-*`, h1 text "Modern nomads", CTA "Смотреть каталог" | Uses a cramped studio product **crop** with heavy dual-gradient; header overlaps it; no landscape/nomad atmosphere; type block bottom-crowded. Rebuild as an editorial landscape-led hero using a **reliable lifestyle first-image**, stronger scrim for header legibility, clearer type hierarchy and route/coordinate metadata. |
| Men/Women split (`category-split-section.tsx`) | minor | hover-expand, focus-within, keyboard, mobile stack | Legible but flat; strengthen type, index labels, hairline route line; ensure captions readable over any image; keep non-hover navigation. |
| Featured collection (`featured-collection-section.tsx`) | major | product cards, CTA | Lead image is `slice(1)` (can empty); layout is a plain 4/8 split; make asymmetric, editorial, image-reliable, one dominant image + 2–3 real products. |
| Featured products (`featured-products-section.tsx`) | major | real products, dominant+supporting idea | Supporting row uses default `ProductCard`s whose images sometimes fail to load → grey cards; detail crop uses `slice(2)` (can empty). Make rhythm deliberate and image-reliable. |
| Modern Nomads (`modern-nomads-section.tsx`) | **critical** | copy intent, CTA, anchor | Full-bleed image via `landscapeImages = menProduct.images.slice(1)…` → **empty → grey**. Rebuild as an Ink landscape section that is premium even with no image (route line, coordinates, big statement) and layers a reliable image when present. |
| Community (`community-section.tsx`) | **critical** | copy intent, CTA | Big `bg-stone` block renders empty (`slice(2)`). Same fix: reliable image + editorial composition, no bare block. |
| Sustainability (`sustainability-section.tsx`) | major | honest facts dl, no invented claims | `slice(2)` image can empty; tighten as an honest spec panel with one reliable image. |
| Footer (`layout/footer.tsx`) | minor | newsletter-pending, nav, giant wordmark | Keep; refine spacing/hierarchy only. |

### Catalog — `catalog/page.tsx`, `catalog/[category]/page.tsx`, `catalog-controls.tsx`, `product-card.tsx`, `product-grid.tsx`

| Item | Severity | Preserve | Improve |
| --- | --- | --- | --- |
| Category header (`page-header.tsx`) | minor | h1 "Каталог"/category name, kicker | Administrative 3fr/1fr split; make quieter and more editorial. |
| Toolbar (`catalog-controls.tsx`) | major | URL filters, `details/summary` desktop panel, mobile `dialog`, sort `select[name=sort]`, "Показать" button | Bordered boxy `toolbar-button`s feel administrative; lighten chrome, keep exact interaction hooks the e2e tests rely on. |
| Product card (`product-card.tsx`) | major | testid, links to `/product/slug`, wishlist, hover second image, color dots, `productType` text (test asserts it) | Floating `bg-paper` badge over image looks template-y; refine card typography/density, image scale, remove chrome, keep `productType` present for the test. |
| Grid density | minor | 2 / 3 / 4 cols | Fine; refine gaps. |
| Empty/related sparsity | major | — | PDP related grid renders sparse (accessories has 1 item in a 4-col grid → huge gap). Constrain columns to item count. |

### Product page — `product/[slug]/page.tsx`, `product-purchase-panel.tsx`

| Item | Severity | Preserve | Improve |
| --- | --- | --- | --- |
| Gallery | minor | mobile snap, desktop 2-col + wide detail break, resilient fallback, priority | Good bones (matches `1.jpg`); tighten rhythm, add position cue, keep 60/40. |
| Purchase panel | major | `data-purchase-ready`, size radios, size-guide note, "В корзину", sticky mobile bar, aria-live, wishlist | Strengthen grouping (price/color/size/action), cleaner rows, blue action only. |
| Related row | major | ProductGrid | Sparse when few items → clamp columns. |
| SEO / JSON-LD | keep | full JSON-LD, canonical, breadcrumbs | Unchanged. |

### Cart — `cart/page.tsx`, `cart-view.tsx`, `cart-drawer.tsx`

| Item | Severity | Preserve | Improve |
| --- | --- | --- | --- |
| Drawer | minor | native `dialog`, Escape/backdrop, aria, subtotal, "Открыть корзину" link, `toolor-cart-open` | Strengthen line hierarchy (bigger image/name/variant per `1.jpg`), quantity in drawer optional; cleaner summary. |
| Cart page | minor | 65/35, sticky summary, mobile sticky checkout, quantity, aria labels | Reduce noise, stronger button hierarchy, calmer summary card. |

## Responsive / a11y notes (verified)

- No horizontal overflow at 375–1920 (e2e guard exists; keep it green).
- Home header is `position:absolute` transparent over hero — needs a scrim so white
  nav stays legible over light lifestyle images.
- Focus-visible outline present globally; keep. Dialogs use native `<dialog>` for
  focus containment + Escape; preserve.
- Keep hover-expand split navigable by keyboard (already `:focus-within`) and never
  hover-only for critical actions.

## Plan (Phases 2–6)

1. **Design system** — shared type scale (`display`/`headline`/`title`/`label`/
   `mono-meta`), refined buttons/links, premium `ResilientEditorialImage` fallback,
   route/coordinate primitives, hero scrim, lighter catalog chrome.
2. **Homepage** — reliable image selection; rebuild hero, nomads, community as
   type/graphic-led Ink sections; asymmetric collection & product edit.
3. **Catalog** — quieter header, lighter toolbar, refined card, clamped related.
4. **Product page** — tightened gallery + grouped purchase panel, clamped related.
5. **Cart** — stronger line hierarchy, calmer summary, clear button hierarchy.

All existing test hooks, routes, data lookups, SEO and the motion slot are held
constant. Continue automatically to implementation.
