"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { BrandLogo } from "@/components/ui/brand-logo";
import { ButtonLink } from "@/components/ui/button";
import type { HeroSectionContent } from "./hero-section";

const HERO_VIDEO = "/media/hero/hero-scroll.mp4";
const HERO_POSTER = "/media/hero/hero-poster.webp";

const DESKTOP_QUERY = "(min-width: 1024px)";

/** Easing applied per frame: rendered += (target - rendered) * SCROLL_EASING. */
const SCROLL_EASING = 0.12;
/** Skip a seek if the target is within ~1 frame (24fps) of the applied time. */
const SEEK_THRESHOLD = 1 / 24;
/** Below this progress delta the scrub loop is considered settled and pauses. */
const SETTLE_EPSILON = 0.0004;

/** Centre logo fade window (scroll progress) — gone before the garment reveal. */
const LOGO_FADE_START = 0.42;
const LOGO_FADE_END = 0.6;
/** How far up the centre logo is nudged from the middle (viewport height). */
const LOGO_SHIFT = "-22svh";
/** Bottom-left copy + CTA reveal window (scroll progress) — after the garment. */
const REVEAL_START = 0.72;
const REVEAL_END = 0.86;
/** Scroll indicator is visible only up to this progress. */
const INDICATOR_END = 0.12;

type CSSVars = React.CSSProperties & Record<string, string>;

/**
 * Full-bleed, scroll-controlled cinematic Hero (desktop ≥1024px). Page scroll
 * drives `video.currentTime` — the video never plays. A short lerp smooths the
 * scrubbing; seeks are throttled to ~1 frame and never queued while the media
 * element is already seeking. Only the video/scroll wiring is client-side; the
 * overlay text is plain, server-friendly HTML.
 *
 * Below 1024px the video is not mounted (the ~11MB file never downloads) and
 * the static fallback in `HeroSection` is shown. `prefers-reduced-motion`
 * collapses the tall scroll area to one screen and disables scrubbing.
 */
export function HeroScrollVideo({
  content,
  className = "",
}: {
  content: HeroSectionContent;
  className?: string;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!isDesktop || !section || !video) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let rafId = 0;
    let looping = false;
    let active = false;
    let duration = 0;
    let sectionTop = 0;
    let sectionHeight = 0;
    let lastApplied = -1;

    const targetProgress = { current: 0 };
    const renderedProgress = { current: 0 };

    const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

    const measure = () => {
      const rect = section.getBoundingClientRect();
      sectionTop = rect.top + window.scrollY;
      sectionHeight = section.offsetHeight;
    };

    const readTarget = () => {
      const scrollable = sectionHeight - window.innerHeight;
      targetProgress.current =
        scrollable <= 0 ? 0 : clamp01((window.scrollY - sectionTop) / scrollable);
    };

    const applyProgress = (p: number) => {
      section.style.setProperty("--hero-progress", p.toFixed(4));
      if (reduceMotion || duration <= 0) return;
      const targetTime = p * duration;
      if (video.seeking) return; // don't queue seeks; retry next frame
      if (Math.abs(targetTime - lastApplied) < SEEK_THRESHOLD) return;
      lastApplied = targetTime;
      video.currentTime = targetTime;
    };

    const loop = () => {
      const target = targetProgress.current;
      renderedProgress.current +=
        (target - renderedProgress.current) * SCROLL_EASING;

      const settled =
        Math.abs(target - renderedProgress.current) < SETTLE_EPSILON;
      if (settled) renderedProgress.current = target;

      applyProgress(renderedProgress.current);

      // Keep animating until eased value settles and no seek is in flight.
      if (!settled || video.seeking) {
        rafId = requestAnimationFrame(loop);
      } else {
        looping = false;
      }
    };

    const startLoop = () => {
      if (looping || !active) return;
      looping = true;
      rafId = requestAnimationFrame(loop);
    };

    const onScroll = () => {
      if (!active) return;
      readTarget();
      startLoop();
    };
    const onResize = () => {
      measure();
      readTarget();
      startLoop();
    };
    const onSeeked = () => startLoop();
    const onError = () => {
      if (process.env.NODE_ENV !== "production") {
        console.error("[hero] failed to load", HERO_VIDEO);
      }
    };
    const onLoadedMetadata = () => {
      duration = Number.isFinite(video.duration) ? video.duration : 0;
      measure();
      readTarget();
      renderedProgress.current = targetProgress.current;
      applyProgress(renderedProgress.current);
    };
    const onLoadedData = () => setReady(true);

    // Scrubbed still — never autoplay.
    video.pause();

    if (video.readyState >= 1) onLoadedMetadata();
    else video.addEventListener("loadedmetadata", onLoadedMetadata);
    if (video.readyState >= 2) onLoadedData();
    else video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);

    const observer = new IntersectionObserver(
      ([entry]) => {
        active = entry.isIntersecting;
        if (active) {
          measure();
          readTarget();
          startLoop();
        } else if (rafId) {
          cancelAnimationFrame(rafId);
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

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
  }, [isDesktop]);

  return (
    <div
      ref={sectionRef}
      className={`relative h-[550svh] motion-reduce:h-[100svh] ${className}`}
      style={{ "--hero-progress": "0" } as CSSVars}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-black">
        {/* Media sits below the pinned header so the garment is never cut. */}
        <div className="absolute inset-x-0 bottom-0 top-[var(--header-height)]">
          {/* Poster layer — instant, stays as fallback if the video fails. */}
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover object-center"
            fill
            priority
            sizes="100vw"
            src={HERO_POSTER}
          />

          {isDesktop ? (
            <video
              ref={videoRef}
              aria-hidden="true"
              className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ${
                ready ? "opacity-100" : "opacity-0"
              }`}
              muted
              playsInline
              poster={HERO_POSTER}
              preload="auto"
              src={HERO_VIDEO}
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
              transform: `translateY(${LOGO_SHIFT})`,
              "--logo-fade-start": String(LOGO_FADE_START),
              "--logo-fade-end": String(LOGO_FADE_END),
            } as CSSVars
          }
        >
          {/* Soft centre scrim keeps the white logo readable over snow. */}
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
