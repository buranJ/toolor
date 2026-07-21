# Design system

## Direction and tokens

The four commerce surfaces use a Modern Nomad / Technical Fashion system: high-density editorial imagery, large grotesk display type, compact uppercase labels and commercially legible controls. The palette is Toolor Blue `#0033A1`, Gray `#7B868C`, Ink `#0D0F10`, Warm White `#F3F1EB`, Stone `#C7CBCB` and white. Blue remains an accent; dark and neutral surfaces carry most layouts.

Geist is the current grotesk fallback because TT Commons Pro files are not present. Typography, spacing, motion durations, easing and z-depth are exposed as CSS tokens. Reduced-motion rules collapse all non-essential transitions.

The current layout decisions are derived from the content analysis in [`VISUAL_REFERENCE_ANALYSIS.md`](./VISUAL_REFERENCE_ANALYSIS.md), not from filenames or direct visual copying.

## Commerce patterns

- Product images use a 3:4 crop, no permanent card border or shadow, and an optional second-image hover state.
- Catalog state is URL-driven. Desktop uses a compact toolbar; mobile uses sticky controls and a native full-screen dialog.
- Product pages use a vertical desktop gallery and sticky purchase panel; mobile uses horizontal snap media and a sticky add action.
- Cart and navigation overlays use native dialogs for Escape handling and focus containment.
- Missing workbook fields are displayed as explicit “not supplied” or “requires confirmation” states.
- Large editorial media cycles through alternate verified images from the same imported product before using a controlled unavailable state.

## Motion boundary

`HeroSection`, `HeroMedia`, `HeroContent` and `HeroMotionSlot` keep meaningful content in the DOM. The hero exposes `data-motion-section`, `data-motion-start` and `data-motion-end`; no animation runtime or future assets are loaded.
