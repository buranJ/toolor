# Performance budget

## Stage one targets

- Core route JavaScript: keep page-specific client code under 70 KB gzip where feasible.
- Catalog/product LCP: target under 2.5 seconds at p75 on representative mobile hardware and 4G.
- CLS: below 0.1; all media reserves dimensions.
- INP: below 200 ms at p75.
- Initial product imagery: one appropriately sized image per visible card, modern format from the future image pipeline.
- No animation, WebGL, CMS, auth, payment or global-state bundles in the baseline.

## Future cinematic budgets

- Core content and navigation must render before the cinematic runtime.
- Poster/LCP asset target: under 250 KB on mobile.
- Motion bootstrap JavaScript target: under 120 KB gzip, lazy and homepage-only.
- Initial frame tranche target: under 1.5 MB on mobile and under 3 MB on desktop; remaining frames progressively loaded.
- Maintain a bounded decoded-frame cache and adapt it using device memory/network signals.
- Reduced-motion and constrained-device paths must load no frame sequence beyond the poster.

Budgets are hypotheses until measured against final assets and analytics; regressions require an explicit decision record.

Current source-host limitation: workbook images are remote and some originals are several thousand pixels wide. Next's optimizer can time out while fetching these hosts, so the prototype loads exact URLs directly and uses source-aware fallbacks. Before production, approved assets must be mirrored to a controlled image CDN with responsive derivatives; the current remote delivery cannot yet meet the LCP target reliably.
