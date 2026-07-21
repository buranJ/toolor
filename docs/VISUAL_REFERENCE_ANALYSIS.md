# Visual reference analysis

Analyzed source directory: `docs/references/`. The references define composition, hierarchy, density and commerce UX only. Their logos, copy, products, brand assets and exact layouts must not be reproduced.

## `1.jpg`

### What is shown

A desktop apparel product-detail page. The first screen uses a narrow thumbnail rail, one dominant model image and a dense purchase panel. Below it are product-information tabs, a large fabric detail image and a four-card related-products row. The visual language is neutral black/white with rounded controls, ratings, promotion labels and reassurance icons.

### Composition worth using

- Strong 60/40 media-to-commerce hierarchy.
- Large product photography above the fold with access to alternate views.
- Purchase information ordered as name → price → color → size → primary action.
- Clear size guide adjacency and a separate wishlist action.
- Material/detail imagery that continues the gallery narrative below the first screen.
- Related products as the final commercial continuation.

### Do not copy

- `VELORA` identity, product photography, copy or icon set.
- Ratings, review counts, sale strike-throughs and discount badges: none exist in the Toolor workbook.
- Heavy rounded cards, pill controls, boxed reassurance icons and generic marketplace chrome.
- Tabs that hide essential source information or imply policies that have not been confirmed.
- Exact thumbnail/main-image/panel proportions.

### Toolor adaptation

Use a more editorial, border-light vertical gallery with full-bleed 3:4 source images. Keep the sticky purchase panel compact and typographic, use Toolor Blue only for the purchase action, and show unknown availability/material/care states explicitly. On mobile, convert the gallery to horizontal snap media and keep the add action sticky. The size-guide line must state that source measurements are not supplied rather than inventing them.

### Page mapping

- Primary: product page.
- Secondary: catalog cards and cart item imagery.

### Components to change or create

- `ProductGallery` composition inside the product route.
- `ProductPurchasePanel` hierarchy and source-status rows.
- `ProductCard` image density and related-products presentation.
- Cart line media sizing for visual continuity.

## `2.jpg`

### What is shown

A long commercial fashion homepage in a warm beige palette. It combines a split text/image hero, service benefits, circular category shortcuts, four editorial category tiles, two promotional banners, a six-column product strip, newsletter and a dense dark footer. It is commercially legible but visually close to a generic fashion marketplace template.

### Composition worth using

- Immediate balance between brand statement, primary CTA and a strong fashion image.
- Clear alternation of editorial imagery and product-selling modules.
- Compact category navigation and predictable commercial section order.
- Dense but calm product presentation with consistent image crops.
- Newsletter/footer transition as a clear ending to the page.
- Warm neutral base that allows imagery to dominate.

### Do not copy

- `LUNORA` identity, photography, copy, product names or service claims.
- Luxury serif headline treatment; Toolor requires a contemporary grotesk.
- Circular category icons, rating stars, review counts, discount prices and sale bubbles.
- Repeated rounded cards, floating white containers and generic Shopify section templates.
- Shipping, returns, security and support promises that are not in the source data.
- The equal-weight grid of many small promotional modules.

### Toolor adaptation

Retain the commercial rhythm but replace the generic module stack with a near-fullscreen hero, interactive Men/Women split, asymmetric collection block, mixed-scale product edit and landscape storytelling. Use Warm White, Ink and Stone for most surfaces with Toolor Blue as a controlled accent. Product grids remain quiet: 3–4 columns on desktop, two on mobile, no ratings, no shadows and minimal badges.

### Page mapping

- Primary: homepage.
- Secondary: catalog and footer.
- Indirect: cart, through its disciplined commercial hierarchy rather than its visual decoration.

### Components to change or create

- `HeroSection`, `HeroMedia`, `HeroContent` and preserved `HeroMotionSlot`.
- `CategorySplitSection`.
- `FeaturedCollectionSection` and `FeaturedProductsSection`.
- `CatalogControls`, `ProductGrid` and `ProductCard`.
- `Footer` newsletter/navigation composition.

## `3.jpg`

### What is shown

An atmospheric outdoor editorial poster with a solitary hiker on a rock, layered misty mountains, a muted olive/stone palette and oversized rotated `NATURE` typography. Small labels are scattered around the frame, including social/author text. The image communicates scale, silence, route and human movement through landscape.

### Composition worth using

- Small human figure against a large mountain environment.
- Layered haze and restrained natural color rather than saturated stock imagery.
- Strong use of scale: landscape first, narrative copy second.
- Sparse route/coordinate metadata as a technical editorial layer.
- Intentional negative space when it strengthens landscape scale.

### Do not copy

- The source photograph, author/social handle, wording or poster identity.
- Rotated page composition and giant vertical typography.
- Random vertical labels, decorative dots and scattered microcopy.
- Instagram-poster framing or text that competes with commerce navigation.
- Brown/olive colors as replacement brand colors.

### Toolor adaptation

Use available Toolor lifestyle imagery as a full-width landscape-style section with dark tonal treatment where necessary. Combine it with a short modern-nomad statement, a restrained route line and coordinates. The content must stay in semantic HTML and remain readable without motion. Future cinematic media attaches only inside `HeroMotionSlot`; this reference does not justify adding animation now.

### Page mapping

- Primary: homepage hero, Modern Nomads and community storytelling.
- Secondary: transitional imagery around catalog/product edits.
- Not a direct cart reference.

### Components to change or create

- `HeroMedia` tonal treatment and editorial metadata.
- `ModernNomadsSection` landscape scale and route graphic.
- `CommunitySection` image/copy proportions.
- Small reusable route/coordinate label treatment in CSS tokens.

## Cross-reference direction by route

### Homepage

Combine the commercial clarity and section cadence of `2.jpg` with the landscape scale and quiet route language of `3.jpg`. `1.jpg` contributes only product-detail imagery and product-to-related-product continuity. Preserve `HeroMotionSlot` as the future cinematic boundary.

### Catalog

Use the calm product rhythm of `2.jpg` but remove its ratings, sale UI, circular categories and boxed card treatment. Images must dominate; controls stay compact and URL-driven.

### Product page

Use `1.jpg` for information order, dominant media, variant selection and related products. Toolor's version must use fewer borders, no ratings or promotions, and explicit workbook limitations.

### Cart

None of the files is a direct cart-layout reference. Derive only their clear commerce hierarchy and large product-media treatment. Keep the drawer and page strictly utilitarian, with quantity, subtotal and next action visually dominant.

## Current implementation comparison

The current implementation already avoids ratings, generic rounded cards, heavy shadows and invented commercial claims. It also has the required motion boundary, interactive category split, URL filters, sticky product panel and cart drawer. The remaining visual weaknesses against the references are:

- Several homepage modules still reserve large neutral blocks when a chosen external image is unavailable, recreating the placeholder problem.
- The hero and collection blocks rely on a single product crop rather than a deliberate source-aware fallback sequence.
- The featured product composition lacks a true non-product lifestyle/detail media role; it is primarily a resized product grid.
- The catalog header and desktop filter row are too administrative and dense compared with the quiet product-first reference rhythm.
- The product gallery lacks a compact image-position cue on mobile and a deliberate full-width detail break on desktop.
- The product panel exposes the correct information but needs stronger grouping around color, size guide and purchase action.
- Cart line hierarchy is functional but could better match the larger image/name/variant relationship seen in `1.jpg`.
- Some legacy placeholder utilities and unused placeholder sections remain in the codebase even though they are no longer part of the four routes.

## Implementation rules derived from the references

1. Never render a large empty gray block when another verified image for the same product is available.
2. Product imagery carries the visual hierarchy; borders and labels are secondary.
3. Keep commercial actions obvious without adding unsupported urgency, ratings or benefits.
4. Use deliberate asymmetric scale, not arbitrary whitespace.
5. Use Toolor Blue for action and navigation emphasis, not as a full-page surface default.
6. Keep motion hooks isolated and ship fully legible static content.

## Implemented response

- `1.jpg`: enlarged the product gallery, added a wide detail-image break, retained a sticky purchase panel, strengthened size/color/action grouping, enlarged cart media and kept related products visually quiet.
- `2.jpg`: rebuilt the homepage around a fullscreen hero, split Men/Women collection entry, asymmetric editorial/product modules and a calmer commercial cadence; reduced catalog controls to one compact filter/sort row.
- `3.jpg`: introduced landscape-led scale, restrained route metadata and technical line details while preserving `HeroMotionSlot` as the only future cinematic integration boundary.
- All four routes use imported workbook products and source image URLs with a product-level fallback sequence. The final fallback is deliberately branded and explicit; no invented product imagery or product facts are introduced.
- Legacy gray-placeholder sections and their supporting utilities were removed from the active codebase.
