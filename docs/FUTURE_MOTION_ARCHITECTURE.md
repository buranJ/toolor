# Future motion architecture

Motion is not implemented in stage one. The content and navigation must remain complete without JavaScript animation.

## Planned layer

- A lazy-loaded cinematic layer attaches only to the homepage hero through a separate `CinematicMotionAdapter`-style interface.
- The primary sequence is a scroll-driven frame-by-frame canvas animation in a pinned hero section.
- GSAP ScrollTrigger may coordinate the pinned timeline; it must live in the isolated motion package and never leak into content sections.
- Scroll progress maps deterministically to a frame index; rendering should avoid React state on every frame.
- Desktop and mobile use separate frame sets, dimensions and loading manifests.
- Frames load progressively: poster and first frame first, nearby frames next, remaining frames during idle/network opportunity.
- The static poster is the failure and no-JavaScript fallback.
- `prefers-reduced-motion` bypasses pinning and frame playback and presents the static content/poster.
- React Three Fiber is optional only for additional WebGL effects; it is not required for the canvas sequence.

## Loading and routing boundaries

- Motion assets must never load on catalog, product, account or informational routes.
- The homepage imports the cinematic runtime lazily after core content is available.
- SEO headings, brand copy, CTAs and navigation remain DOM content and never depend on canvas.
- Every homepage section keeps a stable `data-scroll-anchor` for future scroll timeline coordination.
- A future noindex `/motion-lab` route will prototype frame decoding, memory pressure, breakpoints and reduced-motion behavior away from production pages.

## Proposed interface

```ts
interface CinematicMotionAdapter {
  mount(target: HTMLElement, manifest: FrameManifest): Promise<void>;
  setProgress(progress: number): void;
  destroy(): void;
}
```

The adapter owns canvas lifecycle, frame caching and library integration. Content sections know only their anchor identifiers. Before implementation, benchmark AVIF/WebP/JPEG sequences against video scrubbing, define device memory cutoffs and confirm production assets.
