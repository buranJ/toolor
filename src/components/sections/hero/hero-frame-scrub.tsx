"use client";

import { useEffect, useRef, useState } from "react";

/** Frames live at /media/hero/frames/f001.webp … and are 1-indexed. */
const FRAME_COUNT = 96;
const frameUrl = (index: number) =>
  `/media/hero/frames/f${String(index + 1).padStart(3, "0")}.webp`;

/** Load every Nth frame first so scrubbing works long before the set is in. */
const COARSE_STRIDE = 8;
/** Easing applied per frame, matching the video scrubber's feel. */
const SCROLL_EASING = 0.12;
const SETTLE_EPSILON = 0.0004;

type Stats = {
  drawMs: number;
  fps: number;
  loaded: number;
  failed: number;
  canvas: string;
  draws: number;
};

/**
 * Scroll-driven hero built from a frame sequence painted to a canvas.
 *
 * The video scrubber it replaces had to seek on every scroll tick, and a seek
 * costs a decode — ~14ms on a laptop, several times that on a mid-range phone,
 * which is why the animation was smooth on some devices and not others.
 * Blitting a decoded bitmap is 1–3ms everywhere, so the cost no longer tracks
 * the device's decoder.
 */
export function HeroFrameScrub({
  className = "",
  onStats,
}: {
  className?: string;
  onStats?: (stats: Stats) => void;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>(
    Array.from({ length: FRAME_COUNT }, () => null),
  );
  const loadedRef = useRef(0);
  /** Set once, only to wake the paint loop when the first frames land. */
  const [ready, setReady] = useState(false);
  const repaintRef = useRef<(() => void) | null>(null);
  const failedRef = useRef(0);
  const drawsRef = useRef(0);
  const diagRef = useRef({ canvas: "0x0" });

  // ---- decode the sequence, coarse pass first ----
  useEffect(() => {
    let cancelled = false;
    let done = 0;

    const load = (index: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          if (!cancelled) {
            framesRef.current[index] = img;
            done += 1;
            loadedRef.current = done;
            // Nudge the running loop instead of re-creating it: making the
            // effect depend on the count tore down and rebuilt the rAF loop
            // once per frame — 96 times — and each teardown cancelled the
            // pending draw, so on a slow connection nothing ever painted.
            repaintRef.current?.();
            if (done === 1) setReady(true);
          }
          resolve();
        };
        img.onerror = () => {
          failedRef.current += 1;
          resolve();
        };
        img.src = frameUrl(index);
      });

    void (async () => {
      const coarse: number[] = [];
      for (let i = 0; i < FRAME_COUNT; i += COARSE_STRIDE) coarse.push(i);
      await Promise.all(coarse.map(load));

      // Then the gaps, a few at a time so the main thread keeps breathing.
      const rest = Array.from({ length: FRAME_COUNT }, (_, i) => i).filter(
        (i) => i % COARSE_STRIDE !== 0,
      );
      for (let i = 0; i < rest.length && !cancelled; i += 6) {
        await Promise.all(rest.slice(i, i + 6).map(load));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- scroll → frame ----
  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;
    let looping = false;
    let active = false;
    let sectionTop = 0;
    let sectionHeight = 0;
    let lastDrawn = -1;
    let drawMs = 0;
    let frames = 0;
    let fpsWindow = performance.now();
    let fps = 0;

    const target = { current: 0 };
    const rendered = { current: 0 };
    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

    const measure = () => {
      const rect = section.getBoundingClientRect();
      sectionTop = rect.top + window.scrollY;
      sectionHeight = section.offsetHeight;

      // Match the backing store to the box and the device pixel ratio, so the
      // canvas is crisp without paying for more pixels than the screen has.
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(box.width * dpr);
      const h = Math.round(box.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        lastDrawn = -1;
      }
      diagRef.current.canvas = `${canvas.width}x${canvas.height}`;
    };

    const readTarget = () => {
      const scrollable = sectionHeight - window.innerHeight;
      target.current =
        scrollable <= 0
          ? 0
          : clamp01((window.scrollY - sectionTop) / scrollable);
    };

    /** Nearest frame that has actually decoded, so gaps never blank the canvas. */
    const pick = (index: number) => {
      const all = framesRef.current;
      if (all[index]) return all[index];
      for (let step = 1; step < FRAME_COUNT; step++) {
        if (all[index - step]) return all[index - step];
        if (all[index + step]) return all[index + step];
      }
      return null;
    };

    const draw = (progress: number) => {
      section.style.setProperty("--hero-progress", progress.toFixed(4));
      const index = Math.round(progress * (FRAME_COUNT - 1));
      if (index === lastDrawn) return;

      const img = pick(index);
      if (!img) return;
      lastDrawn = index;

      const t0 = performance.now();
      // Cover fit: fill the canvas, crop the overflow, centred.
      const scale = Math.max(
        canvas.width / img.naturalWidth,
        canvas.height / img.naturalHeight,
      );
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      context.drawImage(
        img,
        (canvas.width - w) / 2,
        (canvas.height - h) / 2,
        w,
        h,
      );
      drawMs = performance.now() - t0;

      frames += 1;
      drawsRef.current += 1;
      const now = performance.now();
      if (now - fpsWindow >= 500) {
        fps = Math.round((frames * 1000) / (now - fpsWindow));
        frames = 0;
        fpsWindow = now;
        // On the element itself, so a bench can read each variant separately
        // instead of relying on which section a shared readout thinks is up.
        section.dataset.heroFps = String(fps);
        section.dataset.heroDrawMs = drawMs.toFixed(2);
        report(fps);
      }
    };

    const report = (fps: number) =>
      onStats?.({
        drawMs: +drawMs.toFixed(2),
        fps,
        loaded: loadedRef.current,
        failed: failedRef.current,
        canvas: diagRef.current.canvas,
        draws: drawsRef.current,
      });

    // Heartbeat: without it a stalled scrubber shows an empty panel and there
    // is no way to tell "no frames decoded" from "the loop never ran".
    const heartbeat = window.setInterval(() => report(0), 700);

    const loop = () => {
      rendered.current += (target.current - rendered.current) * SCROLL_EASING;
      const settled =
        Math.abs(target.current - rendered.current) < SETTLE_EPSILON;
      if (settled) rendered.current = target.current;
      draw(rendered.current);
      if (!settled) raf = requestAnimationFrame(loop);
      else looping = false;
    };

    const start = () => {
      if (looping || !active) return;
      looping = true;
      raf = requestAnimationFrame(loop);
    };

    // A newly decoded frame may be a better match for the current position.
    repaintRef.current = () => {
      lastDrawn = -1;
      start();
    };

    const onScroll = () => {
      if (!active || reduceMotion) return;
      readTarget();
      start();
    };
    const onResize = () => {
      measure();
      readTarget();
      lastDrawn = -1;
      start();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        active = Boolean(entry?.isIntersecting);
        if (active) onResize();
        else if (raf) {
          cancelAnimationFrame(raf);
          looping = false;
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(section);

    const ro = new ResizeObserver(onResize);
    ro.observe(section);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    measure();
    readTarget();
    rendered.current = target.current;

    return () => {
      window.clearInterval(heartbeat);
      repaintRef.current = null;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
    // Deliberately not keyed on the loaded count — see repaintRef above.
  }, [ready, onStats]);

  return (
    <div
      ref={sectionRef}
      className={`relative h-[430svh] motion-reduce:h-[100svh] ${className}`}
      data-testid="hero-frame-scrub"
      style={{ "--hero-progress": "0" } as React.CSSProperties}
    >
      <div
        data-hero-pin
        className="sticky top-0 h-[100svh] w-full overflow-hidden bg-black"
      >
        <div className="absolute inset-x-0 top-[var(--header-height)] bottom-0">
          <canvas ref={canvasRef} className="block h-full w-full" />
        </div>
      </div>
    </div>
  );
}
