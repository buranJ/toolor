"use client";

import { useEffect, useRef, useState } from "react";

const SRC = {
  white: "/run.png",
  black: "/run-k.png",
  grey: "/run-gr.png",
} as const;

type Variant = keyof typeof SRC;

/**
 * Horizontal distance between two runes in the source art: the 430px band
 * carries roughly 22 of them. The reveal derives its step count from this, so
 * one step uncovers one rune however wide the strip is stretched.
 */
const RUNE_PITCH = 19.5;

/**
 * Decorative rune strip that reveals frame-by-frame from one edge when it
 * scrolls into view — like runes being stamped one after another.
 *
 * The artwork is a 430x44 band, so it tiles horizontally at its native height
 * rather than being scaled to a box: the runes stay level and crisp and the
 * strip reaches the end of however wide its container is. Rendering it through
 * `BrandMark` instead forced it into that component's hard-coded 776x425 frame,
 * which letterboxed the band inside a box nine times too tall.
 *
 * The IntersectionObserver watches the outer (unclipped) wrapper; the stepped
 * clip-path lives on an inner span, since a clip-path that empties the observed
 * element itself would keep its intersection ratio at zero.
 * prefers-reduced-motion shows it at rest via the global transition kill-switch.
 */
export function RuneReveal({
  variant = "grey",
  from = "left",
  targetOpacity = 0.75,
  msPerRune = 50,
  maxDuration = 3600,
  height = "2.75rem",
  className = "",
}: {
  variant?: Variant;
  /** Edge the strip reveals from. */
  from?: "left" | "right";
  targetOpacity?: number;
  /** Dwell time per rune. The total duration scales with the strip's width. */
  msPerRune?: number;
  /** Ceiling on the whole reveal, so an ultra-wide strip does not crawl. */
  maxDuration?: number;
  /** Band height; the runes keep their native proportions inside it. */
  height?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const [width, setWidth] = useState(0);

  // A fixed step count stamped the whole strip in a handful of jumps on a wide
  // screen; measuring keeps one step to one rune at any width.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // One step per rune at any width; the cap keeps a 2560px strip from taking
  // seven seconds — it just stamps a little faster.
  const steps = Math.max(1, Math.round((width || 430) / RUNE_PITCH));
  const duration = Math.min(steps * msPerRune, maxDuration);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none block ${className}`}
      style={{ opacity: targetOpacity }}
    >
      <span
        className="block"
        style={{
          height,
          backgroundImage: `url(${SRC[variant]})`,
          backgroundRepeat: "repeat-x",
          backgroundSize: "auto 100%",
          // Anchor the tiling to the edge the reveal starts from, so the run of
          // runes ends flush with that edge instead of mid-glyph.
          backgroundPosition: from === "right" ? "right center" : "left center",
          clipPath: inView
            ? "inset(-5% 0% -5% 0%)"
            : from === "right"
              ? "inset(-5% 0% -5% 100%)"
              : "inset(-5% 100% -5% 0%)",
          transition: `clip-path ${duration}ms steps(${steps}, end)`,
        }}
      />
    </span>
  );
}
