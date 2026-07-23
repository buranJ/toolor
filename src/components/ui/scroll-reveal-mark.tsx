"use client";

import { useEffect, useRef, useState } from "react";

import { BrandMark } from "./brand-mark";

type Variant = "white" | "black" | "grey";

/**
 * Decorative TOOLOR run-emblem (run.png / run-k.png / run-gr.png). When it
 * scrolls into view it sweeps in from a screen edge with a slight rotation
 * and settle. Purely ornamental. Must live inside an `overflow-hidden`
 * parent so the off-edge start position never adds page scroll. Respects
 * prefers-reduced-motion (shows at rest, no motion) via global CSS.
 */
export function ScrollRevealMark({
  variant = "grey",
  from = "left",
  targetOpacity = 0.5,
  rotate = -7,
  className = "",
}: {
  variant?: Variant;
  from?: "left" | "right";
  targetOpacity?: number;
  rotate?: number;
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
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const enter = from === "left" ? "-48%" : "48%";
  const startRotate = from === "left" ? rotate - 10 : rotate + 10;

  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`scroll-reveal-mark pointer-events-none block ${className}`}
      style={{
        opacity: inView ? targetOpacity : 0,
        transform: inView
          ? `translateX(0) rotate(${rotate}deg) scale(1)`
          : `translateX(${enter}) rotate(${startRotate}deg) scale(0.8)`,
        transition:
          "opacity 650ms ease-out, transform 1200ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <BrandMark variant={variant} animate="none" />
    </span>
  );
}
