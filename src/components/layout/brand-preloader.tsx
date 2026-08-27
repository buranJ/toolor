"use client";

import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/ui/brand-logo";

/** Long enough for the wordmark to finish drawing itself. */
const MIN_VISIBLE = 950;
/** Never hold the page longer than this, however slow the connection. */
const MAX_VISIBLE = 1800;
/** Coarse hero frames that make the scroll usable straight away. */
const FRAMES_WANTED = 6;

function heroFramesLoaded() {
  return performance
    .getEntriesByType("resource")
    .filter((entry) => entry.name.includes("/media/hero/frames/")).length;
}

/**
 * Brand moment on a cold load.
 *
 * Deliberately not a fixed timer: it leaves as soon as the hero's first frames
 * are in — or the document is done, on pages that have no hero — so a fast
 * connection is not made to wait. The floor exists only so the wordmark can
 * finish drawing rather than flashing.
 */
export function BrandPreloader({ label }: { label: string }) {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let raf = 0;

    const check = () => {
      // `performance.now()` is measured from navigation start, which is when
      // the overlay was painted. Timing from the effect instead started the
      // clock at hydration — by then the floor had barely begun, so the
      // overlay always ran to its ceiling.
      const elapsed = performance.now();
      // Only the home page has frames worth waiting for. Elsewhere the
      // fallback was `readyState`, which waits for every image on the page —
      // it held the overlay on the catalogue for 2.7s.
      const hasHero = document.querySelector('[data-scroll-anchor="hero"]');
      const ready = hasHero
        ? heroFramesLoaded() >= FRAMES_WANTED ||
          document.readyState === "complete"
        : true;
      if (elapsed >= MAX_VISIBLE || (ready && elapsed >= MIN_VISIBLE)) {
        setLeaving(true);
        return;
      }
      raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);

    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setGone(true), 500);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (gone) return null;

  return (
    <div
      aria-hidden="true"
      className="brand-preloader"
      data-leaving={leaving}
      role="presentation"
    >
      <span className="brand-preloader-mark">
        <BrandLogo tone="blue" className="w-[min(58vw,20rem)]" title={label} />
      </span>
    </div>
  );
}
