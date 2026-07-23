"use client";

import { useEffect, useRef, useState } from "react";

import { BrandMark } from "./brand-mark";

type Variant = "white" | "black" | "grey";

/**
 * Decorative rune strip that reveals frame-by-frame from one edge when it
 * scrolls into view — like runes being stamped one after another. The
 * IntersectionObserver watches the outer (unclipped) wrapper; the stepped
 * clip-path lives on an inner span, since a clip-path that empties the
 * observed element itself would keep its intersection ratio at zero.
 * prefers-reduced-motion shows it at rest via the global transition
 * kill-switch.
 */
export function RuneReveal({
  variant = "grey",
  from = "left",
  targetOpacity = 0.75,
  frames = 9,
  duration = 1600,
  className = "",
}: {
  variant?: Variant;
  /** Edge the strip reveals from. */
  from?: "left" | "right";
  targetOpacity?: number;
  frames?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

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
          clipPath: inView
            ? "inset(-5% 0% -5% 0%)"
            : from === "right"
              ? "inset(-5% 0% -5% 100%)"
              : "inset(-5% 100% -5% 0%)",
          transition: `clip-path ${duration}ms steps(${frames}, end)`,
        }}
      >
        <BrandMark variant={variant} animate="none" priority />
      </span>
    </span>
  );
}
