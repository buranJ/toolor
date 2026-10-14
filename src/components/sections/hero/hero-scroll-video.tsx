"use client";

import { getImageProps } from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { BrandLogo } from "@/components/ui/brand-logo";
import { ButtonLink } from "@/components/ui/button";
import {
  type FrameSource,
  type Painter,
  StillSequenceSource,
  VideoTrackSource,
  videoTrackSupported,
} from "./hero-frame-sources";
import {
  HERO_DESKTOP_QUERY,
  HERO_STILLS,
  HERO_TRACK,
  type HeroMode,
  heroStillUrl,
} from "./hero-media";
import type { HeroSectionContent } from "./hero-section";

const HERO_POSTER = "/media/hero/hero-poster.webp";
const HERO_POSTER_MOBILE = "/media/hero/hero-poster-mobile.webp";

/** Art-directed poster: each breakpoint's own crop through the optimizer. */
const posters = (() => {
  const common = {
    alt: "",
    fill: true,
    priority: true,
    fetchPriority: "high" as const,
    sizes: "100vw",
  };
  const desktop = getImageProps({ ...common, src: HERO_POSTER }).props;
  const { srcSet: mobile, ...img } = getImageProps({
    ...common,
    src: HERO_POSTER_MOBILE,
  }).props;
  return { desktop: desktop.srcSet, mobile, img };
})();

/**
 * Time constant of the scroll smoothing: the picture closes ~63% of the gap
 * to the scroll position every this many ms. Time-based, so a 120Hz phone
 * and a 60Hz laptop feel the same.
 */
const SCROLL_SMOOTHING_MS = 70;
/** Below this progress delta the loop is considered settled and pauses. */
const SETTLE_EPSILON = 0.0002;

/** Centre logo fade window (scroll progress) — gone before the garment reveal. */
const LOGO_FADE_START = 0.42;
const LOGO_FADE_END = 0.6;
/** Bottom-left copy + CTA reveal window (scroll progress) — after the garment. */
const REVEAL_START = 0.72;
const REVEAL_END = 0.86;
/** Scroll indicator is visible only up to this progress. */
const INDICATOR_END = 0.12;

type CSSVars = React.CSSProperties & Record<string, string>;

type ConnectionInfo = {
  saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

const connection = () =>
  (navigator as Navigator & { connection?: ConnectionInfo }).connection;

/** Visitors who asked for less motion, or are paying for every megabyte. */
function stillSnapshot() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return true;
  // A fluctuating throughput estimate must not remove the canvas and change
  // the page height mid-scroll. Only explicit visitor preferences opt out.
  return connection()?.saveData === true;
}

function subscribeStill(notify: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", notify);
  const conn = connection();
  conn?.addEventListener?.("change", notify);
  return () => {
    mq.removeEventListener("change", notify);
    conn?.removeEventListener?.("change", notify);
  };
}

function subscribeDesktop(notify: () => void) {
  const mq = window.matchMedia(HERO_DESKTOP_QUERY);
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
}

const desktopSnapshot = () => window.matchMedia(HERO_DESKTOP_QUERY).matches;
/** Mobile-first while rendering on the server, where no media query exists. */
const serverFalse = () => false;

/**
 * Full-bleed, scroll-controlled cinematic hero.
 *
 * Page scroll drives the clip painted to a canvas. Frames come from an H.264
 * track decoded with WebCodecs — every frame of the source, so scrubbing
 * reads as video rather than a flip-book — or, where WebCodecs is missing,
 * from WebP stills. The poster stays underneath until the first frame lands.
 *
 * `prefers-reduced-motion` and Data Saver collapse the tall scroll area to one
 * screen and keep the poster.
 */
export function HeroScrollVideo({
  content,
  className = "",
}: {
  content: HeroSectionContent;
  className?: string;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<FrameSource | null>(null);
  const sourceModeRef = useRef<HeroMode | null>(null);
  const sourceActiveRef = useRef(true);
  /** Native size of the current source's frames; sizes the canvas. */
  const frameSizeRef = useRef<{ width: number; height: number }>(
    HERO_TRACK.mobile,
  );
  /** Set by the paint loop: draws a frame onto the canvas. */
  const paintRef = useRef<Painter | null>(null);
  /** Set by the paint loop: re-measure and re-request after a source swap. */
  const refreshRef = useRef<(() => void) | null>(null);

  const [painted, setPainted] = useState(false);
  const still = useSyncExternalStore(
    subscribeStill,
    stillSnapshot,
    serverFalse,
  );
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    desktopSnapshot,
    serverFalse,
  );
  const mediaMode: HeroMode = isDesktop ? "desktop" : "mobile";

  // ---- frame source: video track, stills as the fallback ----
  useEffect(() => {
    if (still) {
      sourceRef.current?.dispose();
      sourceRef.current = null;
      sourceModeRef.current = null;
      return;
    }
    // Read the breakpoint here rather than trusting the rendered value: the
    // server snapshot is mobile-first, so on a desktop the first run would
    // start fetching the phone track before hydration corrected it.
    const mode: HeroMode = window.matchMedia(HERO_DESKTOP_QUERY).matches
      ? "desktop"
      : "mobile";
    // No cleanup between runs: this effect re-runs when hydration settles the
    // breakpoint, and tearing the source down there would restart the
    // download it had just begun.
    if (sourceRef.current && sourceModeRef.current === mode) return;
    sourceRef.current?.dispose();
    sourceModeRef.current = mode;

    const paint: Painter = (image, width, height) =>
      paintRef.current?.(image, width, height);
    const startStills = () => {
      frameSizeRef.current = HERO_STILLS[mode];
      sourceRef.current = new StillSequenceSource(
        HERO_STILLS.count,
        (index) => heroStillUrl(mode, index),
        paint,
      );
      sourceRef.current.setActive(sourceActiveRef.current);
      refreshRef.current?.();
    };

    if (videoTrackSupported()) {
      frameSizeRef.current = HERO_TRACK[mode];
      const source: FrameSource = new VideoTrackSource(
        HERO_TRACK[mode],
        paint,
        // Codec refused or decoder broken: fall back only if this source is
        // still the current one.
        () => {
          if (sourceRef.current === source) startStills();
        },
      );
      sourceRef.current = source;
      source.setActive(sourceActiveRef.current);
      refreshRef.current?.();
    } else {
      startStills();
    }
  }, [isDesktop, still]);

  useEffect(
    () => () => {
      sourceRef.current?.dispose();
      sourceRef.current = null;
      sourceModeRef.current = null;
    },
    [],
  );

  // ---- scroll → frame ----
  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas || still) return;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let raf = 0;
    let pendingPaint: { image: CanvasImageSource; release: () => void } | null =
      null;
    let looping = false;
    let active = false;
    let intersecting = false;
    let sectionTop = 0;
    let sectionHeight = 0;
    let lastTime = 0;
    let hasPainted = false;

    const target = { current: 0 };
    const rendered = { current: 0 };
    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

    const cancelPaint = () => {
      pendingPaint?.release();
      pendingPaint = null;
    };

    /** Keep the latest asynchronous decoder output for the shared render tick.
     * Clones share native pixels but outlive the source's frame ownership. */
    paintRef.current = (image, width, height) => {
      if (!canvas.width || !width || !height) return;
      const frame =
        typeof VideoFrame !== "undefined" && image instanceof VideoFrame
          ? image.clone()
          : null;
      pendingPaint?.release();
      pendingPaint = { image: frame ?? image, release: () => frame?.close() };
      start();
    };

    const commitPaint = () => {
      const pending = pendingPaint;
      pendingPaint = null;
      if (!pending) return;
      try {
        // CSS object-fit performs cover cropping in the compositor. At
        // native resolution this is a direct frame copy, not a costly
        // high-quality upscale/crop on every decoder callback.
        context.drawImage(pending.image, 0, 0, canvas.width, canvas.height);
        canvas.dataset.painted = "true";
        canvas.style.opacity = "1";
        if (!hasPainted) {
          hasPainted = true;
          setPainted(true);
        }
      } finally {
        pending.release();
      }
    };

    /** Size the canvas; returns whether that cleared it. */
    const measure = () => {
      const rect = section.getBoundingClientRect();
      sectionTop = rect.top + window.scrollY;
      sectionHeight = section.offsetHeight;

      const box = canvas.getBoundingClientRect();
      // Keep the source aspect ratio. Full-density phones/laptops use the
      // native buffer; retracting mobile toolbars then need no canvas reset.
      // For lower-density displays, reserve enough source pixels for cover.
      const frame = frameSizeRef.current;
      const scale = Math.min(
        1,
        Math.max(box.width / frame.width, box.height / frame.height) *
          (window.devicePixelRatio || 1),
      );
      let gcd = frame.width,
        divisor = frame.height;
      while (divisor) {
        [gcd, divisor] = [divisor, gcd % divisor];
      }
      const steps = Math.ceil(scale * gcd);
      const w = (frame.width / gcd) * steps;
      const h = (frame.height / gcd) * steps;
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.style.opacity = "0";
        canvas.dataset.painted = "false";
        canvas.width = w;
        canvas.height = h;
        context.imageSmoothingQuality = "high";
        return true;
      }
      return false;
    };

    const readTarget = () => {
      const scrollable = sectionHeight - window.innerHeight;
      target.current =
        scrollable <= 0
          ? 0
          : clamp01((window.scrollY - sectionTop) / scrollable);
    };

    const draw = (progress: number) => {
      section.style.setProperty("--hero-progress", progress.toFixed(4));
      if (canvas.width) sourceRef.current?.show(progress);
    };

    const loop = (time: number) => {
      const dt = lastTime ? Math.min(time - lastTime, 100) : 16.7;
      lastTime = time;
      rendered.current +=
        (target.current - rendered.current) *
        (1 - Math.exp(-dt / SCROLL_SMOOTHING_MS));
      const settled =
        Math.abs(target.current - rendered.current) < SETTLE_EPSILON;
      if (settled) rendered.current = target.current;
      draw(rendered.current);
      // Cached frames are ready synchronously inside show(). Present them
      // in this tick, not in a second rAF that adds a whole display interval.
      // Decoder callbacks between ticks replace pendingPaint, never draw twice.
      commitPaint();
      if (!settled) raf = requestAnimationFrame(loop);
      else {
        looping = false;
        lastTime = 0;
      }
    };

    const start = () => {
      if (looping || !active) return;
      looping = true;
      raf = requestAnimationFrame(loop);
    };

    const onScroll = () => {
      if (!active) return;
      readTarget();
      start();
    };
    const onResize = () => {
      // Resizing clears the canvas; put the current frame straight back so
      // the collapsing mobile toolbar never flashes black.
      if (measure()) sourceRef.current?.repaint();
      readTarget();
      start();
    };

    refreshRef.current = () => {
      if (measure()) sourceRef.current?.repaint();
      draw(rendered.current);
    };

    const updateActive = () => {
      active = intersecting && !document.hidden;
      sourceActiveRef.current = active;
      sourceRef.current?.setActive(active);
      if (active) onResize();
      else if (raf) {
        cancelAnimationFrame(raf);
        looping = false;
        lastTime = 0;
      }
      if (!active) cancelPaint();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        intersecting = Boolean(entry?.isIntersecting);
        updateActive();
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(section);

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(section);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", updateActive);
    measure();
    readTarget();
    rendered.current = target.current;
    draw(rendered.current);

    return () => {
      paintRef.current = null;
      cancelPaint();
      refreshRef.current = null;
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", updateActive);
    };
  }, [mediaMode, still]);

  return (
    <div
      ref={sectionRef}
      data-testid="hero-scroll-video"
      data-still={still}
      className={`relative h-[300svh] motion-reduce:h-[100dvh] lg:h-[340svh] ${
        still ? "!h-[100dvh]" : ""
      } ${className}`}
      style={
        {
          "--hero-progress": "0",
        } as CSSVars
      }
    >
      {/* dvh, not svh: `svh` is the viewport with the browser toolbar shown,
          so once the toolbar retracted the pinned layer was shorter than the
          screen and the page background showed through as a white strip along
          the bottom. `dvh` tracks the viewport as it actually is. */}
      <div className="sticky top-0 h-[100dvh] w-full overflow-hidden bg-black">
        {/* Media sits below the pinned header so the garment is never cut. */}
        <div className="absolute inset-x-0 top-[var(--header-height)] bottom-0">
          {/* Poster paints instantly and stays until the first frame lands.
              One <picture>, not two images hidden per breakpoint: both of
              those were preloaded, so every phone also fetched the desktop
              poster. */}
          <picture>
            <source media={HERO_DESKTOP_QUERY} srcSet={posters.desktop} />
            <source srcSet={posters.mobile} />
            <img
              {...posters.img}
              alt=""
              aria-hidden="true"
              className="object-cover object-center"
            />
          </picture>

          {!still ? (
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              data-painted={painted}
              data-testid="hero-scroll-media"
              className={`absolute inset-0 block h-full w-full object-cover object-center transition-opacity duration-500 ${
                painted ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null}
        </div>

        {/* Readability overlay — darker left & bottom, clear centre. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-tr from-black/55 via-black/10 to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent"
        />

        {/* Centre brand logo — leads over the scene, fades before the reveal. */}
        <div
          data-testid="hero-brand-logo"
          className="absolute inset-0 flex items-center justify-center px-6"
          style={
            {
              opacity:
                "clamp(0, calc((var(--logo-fade-end) - var(--hero-progress, 0)) / (var(--logo-fade-end) - var(--logo-fade-start))), 1)",
              "--logo-fade-start": String(LOGO_FADE_START),
              "--logo-fade-end": String(LOGO_FADE_END),
            } as CSSVars
          }
        >
          {/* Unfiltered wordmark: no shadow layer or vertical offset. */}
          <h1 className="relative max-w-full">
            <BrandLogo
              tone="white"
              className="w-[clamp(18rem,58vw,52rem)] max-w-full"
              title="TOOLOR"
            />
            <span className="sr-only">{content.title}</span>
          </h1>
        </div>

        {/* Bottom-left copy + CTA — revealed once the garment is in frame. */}
        <div
          className="hero-copy absolute inset-x-0 bottom-0"
          style={
            {
              opacity:
                "clamp(0, calc((var(--hero-progress, 0) - var(--reveal-start)) / (var(--reveal-end) - var(--reveal-start))), 1)",
              transform:
                "translateY(calc((1 - clamp(0, calc((var(--hero-progress, 0) - var(--reveal-start)) / (var(--reveal-end) - var(--reveal-start))), 1)) * 1.25rem))",
              "--reveal-start": String(REVEAL_START),
              "--reveal-end": String(REVEAL_END),
            } as CSSVars
          }
        >
          <div className="mx-auto w-full max-w-[1600px] px-4 pb-16 sm:px-6 lg:px-10 lg:pb-24">
            <div className="max-w-md text-white">
              <p className="text-base leading-relaxed text-white/85 md:text-lg">
                {content.description}
              </p>
              <div className="mt-6">
                <ButtonLink
                  href={content.primaryCta.href}
                  variant="primary"
                  size="lg"
                >
                  {content.primaryCta.label}
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator — visible only at the very start. */}
        <div
          aria-hidden="true"
          className={`absolute inset-x-0 bottom-6 flex justify-center motion-reduce:hidden ${still ? "hidden" : ""}`}
          style={
            {
              opacity:
                "clamp(0, calc((var(--indicator-end) - var(--hero-progress, 0)) / var(--indicator-end)), 1)",
              "--indicator-end": String(INDICATOR_END),
            } as CSSVars
          }
        >
          <span className="flex h-9 w-6 items-start justify-center rounded-full border border-white/50 p-1">
            <span className="hero-scroll-dot block h-2 w-1 rounded-full bg-white/80" />
          </span>
        </div>
      </div>
    </div>
  );
}
