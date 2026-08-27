"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { BrandLogo } from "@/components/ui/brand-logo";
import { ButtonLink } from "@/components/ui/button";
import type { HeroSectionContent } from "./hero-section";

const HERO_POSTER = "/media/hero/hero-poster.webp";
const HERO_POSTER_MOBILE = "/media/hero/hero-poster-mobile.webp";

const FRAME_COUNT = 96;
/**
 * Native size of each set, cut straight from the 4K masters. The canvas is
 * sized from these: drawing into a backing store smaller than the frame threw
 * away detail, and one larger only invented pixels.
 */
const FRAME_SIZE = {
  mobile: { width: 1080, height: 1920 },
  desktop: { width: 2880, height: 1620 },
} as const;
const frameUrl = (mode: "mobile" | "desktop", index: number) =>
  `/media/hero/frames/${mode}/f${String(index + 1).padStart(3, "0")}.webp`;

const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Stride of each loading pass. The first gets the scrub working on a tenth of
 * the bytes; each following pass halves the gaps everywhere at once.
 */
const LOAD_PASSES = [8, 4, 2, 1] as const;
/** Easing applied per frame: rendered += (target - rendered) * SCROLL_EASING. */
const SCROLL_EASING = 0.12;
/** Below this progress delta the loop is considered settled and pauses. */
const SETTLE_EPSILON = 0.0004;
/**
 * Sub-steps the paint loop distinguishes inside one frame interval. Only the
 * frame index changes the picture, but sampling finer keeps the CSS-driven
 * overlays — logo fade, CTA reveal — moving continuously.
 */
const PROGRESS_STEPS = 8;

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
  effectiveType?: string;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

const connection = () =>
  (navigator as Navigator & { connection?: ConnectionInfo }).connection;

/** Visitors who asked for less motion, or are paying for every megabyte. */
function stillSnapshot() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return true;
  const conn = connection();
  if (!conn) return false;
  return (
    conn.saveData === true ||
    conn.effectiveType === "slow-2g" ||
    conn.effectiveType === "2g" ||
    conn.effectiveType === "3g"
  );
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
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
}

const desktopSnapshot = () => window.matchMedia(DESKTOP_QUERY).matches;
/** Mobile-first while rendering on the server, where no media query exists. */
const serverFalse = () => false;

/**
 * Full-bleed, scroll-controlled cinematic hero.
 *
 * Page scroll drives a frame sequence painted to a canvas. It used to drive
 * `video.currentTime` instead, which meant a decode on every scroll tick:
 * ~11ms on a laptop and several times that on a phone, so the animation was
 * smooth on some devices and a slideshow on others — and on iOS the element
 * often never left its poster at all. Blitting a decoded frame is ~0.1ms
 * regardless of hardware, and the coarse-first load means the scrub responds
 * after roughly a tenth of the bytes.
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
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);
  const repaintRef = useRef<(() => void) | null>(null);
  const loadedModeRef = useRef<"mobile" | "desktop" | null>(null);
  const modeRef = useRef<"mobile" | "desktop">("mobile");

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
  const mediaMode: "mobile" | "desktop" = isDesktop ? "desktop" : "mobile";

  // ---- decode the sequence, coarse pass first ----
  useEffect(() => {
    if (still) return;
    // Read the breakpoint here rather than trusting the rendered value: the
    // server snapshot is mobile-first, so on a desktop the coarse pass had
    // already fetched a dozen phone frames before hydration corrected it.
    const mode = window.matchMedia(DESKTOP_QUERY).matches
      ? "desktop"
      : "mobile";
    modeRef.current = mode;
    if (loadedModeRef.current === mode) return;
    loadedModeRef.current = mode;

    // Identity, not a cancel flag: this effect re-runs when hydration settles
    // the breakpoint, and cancelling on cleanup killed the in-flight load
    // while the guard above stopped it from ever restarting. A load that
    // belongs to a superseded mode simply finds a different array here and
    // drops itself.
    const frames: (HTMLImageElement | null)[] = Array.from(
      { length: FRAME_COUNT },
      () => null,
    );
    framesRef.current = frames;

    const load = (index: number) =>
      new Promise<void>((resolve) => {
        // `Image` here is next/image; the DOM constructor lives on window.
        const img = new window.Image();
        img.decoding = "async";
        img.onload = () => {
          if (framesRef.current === frames) {
            frames[index] = img;
            // Nudge the running loop rather than re-creating it: keying the
            // paint effect on a load counter tore it down once per frame and
            // each teardown cancelled the pending draw.
            repaintRef.current?.();
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = frameUrl(mode, index);
      });

    void (async () => {
      // Halve the stride each pass instead of filling left-to-right: the old
      // order left the tail of the sequence empty for seconds, so scrubbing
      // jumped between distant frames while the middle filled in. Now the
      // whole strip gets steadily denser.
      const seen = new Set<number>();
      for (const stride of LOAD_PASSES) {
        const batch: number[] = [];
        for (let i = 0; i < FRAME_COUNT; i += stride) {
          if (!seen.has(i)) {
            seen.add(i);
            batch.push(i);
          }
        }
        for (let i = 0; i < batch.length; i += 6) {
          if (framesRef.current !== frames) return;
          await Promise.all(batch.slice(i, i + 6).map(load));
        }
      }
    })();
  }, [isDesktop, still]);

  // ---- scroll → frame ----
  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas || still) return;
    modeRef.current = window.matchMedia(DESKTOP_QUERY).matches
      ? "desktop"
      : "mobile";

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let raf = 0;
    let looping = false;
    let active = false;
    let sectionTop = 0;
    let sectionHeight = 0;
    let lastDrawn = -1;

    const target = { current: 0 };
    const rendered = { current: 0 };
    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

    const measure = () => {
      const rect = section.getBoundingClientRect();
      sectionTop = rect.top + window.scrollY;
      sectionHeight = section.offsetHeight;

      const box = canvas.getBoundingClientRect();
      // Match the screen, but never ask for more pixels than the frames hold:
      // a flat 2x cap left the canvas below both the screen and the artwork on
      // a 3x phone, so the picture was upscaled twice over.
      const frame = FRAME_SIZE[modeRef.current];
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        box.width > 0 ? frame.width / box.width : 1,
      );
      const w = Math.round(box.width * dpr);
      const h = Math.round(box.height * dpr);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
        lastDrawn = -1;
      }
    };

    const readTarget = () => {
      const scrollable = sectionHeight - window.innerHeight;
      target.current =
        scrollable <= 0
          ? 0
          : clamp01((window.scrollY - sectionTop) / scrollable);
    };

    /** Nearest decoded frame, so gaps in the sequence never blank the canvas. */
    const pick = (index: number) => {
      const all = framesRef.current;
      if (all[index]) return all[index];
      for (let step = 1; step < FRAME_COUNT; step++) {
        if (all[index - step]) return all[index - step];
        if (all[index + step]) return all[index + step];
      }
      return null;
    };

    /** Cover fit: fill the canvas, crop the overflow, centred. */
    const paint = (img: HTMLImageElement) => {
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
    };

    const draw = (progress: number) => {
      section.style.setProperty("--hero-progress", progress.toFixed(4));
      if (!canvas.width) return;

      const exact = progress * (FRAME_COUNT - 1);
      // Redraw on sub-steps, not only when the frame index changes.
      const key = Math.round(exact * PROGRESS_STEPS);
      if (key === lastDrawn) return;

      const index = Math.floor(exact);
      const base = pick(index);
      if (!base) return;
      lastDrawn = key;

      paint(base);

      setPainted(true);
    };

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

    repaintRef.current = () => {
      lastDrawn = -1;
      start();
    };

    const onScroll = () => {
      if (!active) return;
      readTarget();
      start();
    };
    const onResize = () => {
      measure();
      readTarget();
      lastDrawn = -1;
      start();
    };

    const observer = new IntersectionObserver(
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
    observer.observe(section);

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(section);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    measure();
    readTarget();
    rendered.current = target.current;

    return () => {
      repaintRef.current = null;
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [mediaMode, still]);

  return (
    <div
      ref={sectionRef}
      data-testid="hero-scroll-video"
      className={`relative h-[300svh] motion-reduce:h-[100svh] lg:h-[340svh] ${
        still ? "!h-[100svh]" : ""
      } ${className}`}
      style={
        {
          "--hero-logo-shift": mediaMode === "desktop" ? "-22svh" : "-15svh",
          "--hero-progress": "0",
        } as CSSVars
      }
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-black">
        {/* Media sits below the pinned header so the garment is never cut. */}
        <div className="absolute inset-x-0 top-[var(--header-height)] bottom-0">
          {/* Poster paints instantly and stays until the first frame lands. */}
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover object-center lg:hidden"
            fill
            priority
            sizes="100vw"
            src={HERO_POSTER_MOBILE}
          />
          <Image
            alt=""
            aria-hidden="true"
            className="hidden object-cover object-center lg:block"
            fill
            priority
            sizes="100vw"
            src={HERO_POSTER}
          />

          {!still ? (
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              data-testid="hero-scroll-media"
              className={`absolute inset-0 block h-full w-full transition-opacity duration-500 ${
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
          className="absolute inset-0 flex items-center justify-center px-6"
          style={
            {
              opacity:
                "clamp(0, calc((var(--logo-fade-end) - var(--hero-progress, 0)) / (var(--logo-fade-end) - var(--logo-fade-start))), 1)",
              transform: "translateY(var(--hero-logo-shift))",
              "--logo-fade-start": String(LOGO_FADE_START),
              "--logo-fade-end": String(LOGO_FADE_END),
            } as CSSVars
          }
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.4),transparent_62%)]"
          />
          <h1 className="relative drop-shadow-[0_6px_34px_rgba(0,0,0,0.35)]">
            <BrandLogo
              tone="white"
              className="w-[clamp(18rem,58vw,52rem)]"
              title="TOOLOR"
            />
            <span className="sr-only">{content.title}</span>
          </h1>
        </div>

        {/* Bottom-left copy + CTA — revealed once the garment is in frame. */}
        <div
          className="absolute inset-x-0 bottom-0"
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
          className="absolute inset-x-0 bottom-6 flex justify-center motion-reduce:hidden"
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
