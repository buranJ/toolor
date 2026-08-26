"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { HeroFrameScrub } from "./hero-frame-scrub";

type Stats = {
  drawMs: number;
  fps: number;
  loaded: number;
  failed?: number;
  canvas?: string;
  draws?: number;
};

function Readout({
  title,
  note,
  stats,
}: {
  title: string;
  note: string;
  stats: Stats | null;
}) {
  return (
    <div
      className="pointer-events-none fixed top-2 left-2 z-50 rounded-lg bg-black/75 px-3 py-2 font-mono text-[0.65rem] leading-relaxed text-white backdrop-blur"
      data-hero-draw-ms={stats?.drawMs ?? ""}
      /* Real visual updates per second — canvas repaints for A, completed
         seeks for B and C. Counting rAF ticks instead measured the browser's
         paint loop, which keeps running even when the hero never changes. */
      data-hero-fps={stats?.fps ?? ""}
      data-testid="hero-readout"
      data-variant={title.slice(0, 1)}
    >
      <div className="font-semibold">{title}</div>
      <div className="text-white/70">{note}</div>
      <div>fps: {stats?.fps ?? "—"}</div>
      <div>кадр: {stats?.drawMs ?? "—"} мс</div>
      {stats?.canvas !== undefined ? (
        <div className="mt-1 border-t border-white/20 pt-1 text-white/70">
          <div>
            загружено: {stats.loaded}/96 · ошибок: {stats.failed ?? 0}
          </div>
          <div>canvas: {stats.canvas}</div>
          <div>отрисовок: {stats.draws ?? 0}</div>
        </div>
      ) : null}
    </div>
  );
}

/** Video scrubber, isolated here so the bench does not touch the live hero. */
function VideoScrub({
  src,
  label,
  onStats,
}: {
  src: string;
  label: string;
  onStats: (s: Stats) => void;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    let raf = 0,
      looping = false,
      active = false;
    let top = 0,
      height = 0,
      duration = 0,
      lastApplied = -1;
    let seeks = 0,
      window0 = performance.now(),
      seekMs = 0,
      seekStart = 0;
    const target = { current: 0 },
      rendered = { current: 0 };
    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

    const measure = () => {
      const r = section.getBoundingClientRect();
      top = r.top + window.scrollY;
      height = section.offsetHeight;
    };
    const read = () => {
      const scrollable = height - window.innerHeight;
      target.current =
        scrollable <= 0 ? 0 : clamp01((window.scrollY - top) / scrollable);
    };
    const apply = (p: number) => {
      section.style.setProperty("--hero-progress", p.toFixed(4));
      if (duration <= 0 || video.seeking) return;
      const t = p * duration;
      if (Math.abs(t - lastApplied) < 1 / 24) return;
      lastApplied = t;
      seekStart = performance.now();
      video.currentTime = t;
    };
    const loop = () => {
      rendered.current += (target.current - rendered.current) * 0.12;
      const settled = Math.abs(target.current - rendered.current) < 0.0004;
      if (settled) rendered.current = target.current;
      apply(rendered.current);
      if (!settled || video.seeking) raf = requestAnimationFrame(loop);
      else looping = false;
    };
    const start = () => {
      if (!looping && active) {
        looping = true;
        raf = requestAnimationFrame(loop);
      }
    };
    const onScroll = () => {
      if (active) {
        read();
        start();
      }
    };
    const onResize = () => {
      measure();
      read();
      start();
    };
    const onSeeked = () => {
      seeks += 1;
      seekMs = performance.now() - seekStart;
      const now = performance.now();
      if (now - window0 >= 500) {
        const fps = Math.round((seeks * 1000) / (now - window0));
        // Published on the element itself so a bench can read each variant
        // separately rather than through a shared readout.
        section.dataset.heroFps = String(fps);
        section.dataset.heroDrawMs = seekMs.toFixed(2);
        onStats({ fps, drawMs: +seekMs.toFixed(2), loaded: 0 });
        seeks = 0;
        window0 = now;
      }
      start();
    };
    const onMeta = () => {
      duration = Number.isFinite(video.duration) ? video.duration : 0;
      measure();
      read();
      apply(rendered.current);
    };

    video.pause();
    if (video.readyState >= 1) onMeta();
    else video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("seeked", onSeeked);

    const io = new IntersectionObserver(
      ([e]) => {
        active = Boolean(e?.isIntersecting);
        if (active) onResize();
        else if (raf) {
          cancelAnimationFrame(raf);
          looping = false;
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(section);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("seeked", onSeeked);
    };
  }, [onStats]);

  return (
    <div
      ref={sectionRef}
      className="relative h-[430svh]"
      data-testid={label}
      style={{ "--hero-progress": "0" } as React.CSSProperties}
    >
      <div
        data-hero-pin
        className="sticky top-0 h-[100svh] w-full overflow-hidden bg-black"
      >
        <div className="absolute inset-x-0 top-[var(--header-height)] bottom-0">
          <video
            ref={videoRef}
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            muted
            playsInline
            preload="auto"
            src={src}
          />
        </div>
      </div>
    </div>
  );
}

export function HeroLab() {
  const [a, setA] = useState<Stats | null>(null);
  const [b, setB] = useState<Stats | null>(null);
  const [c, setC] = useState<Stats | null>(null);
  const [visible, setVisible] = useState<"A" | "B" | "C">("A");

  const onA = useCallback((s: Stats) => setA(s), []);
  const onB = useCallback((s: Stats) => setB(s), []);
  const onC = useCallback((s: Stats) => setC(s), []);

  useEffect(() => {
    const marks = [
      ["A", "sec-a"],
      ["B", "sec-b"],
      ["C", "sec-c"],
    ] as const;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const sectionId = e.target.closest("section")?.id;
            const hit = marks.find(([, id]) => sectionId === id);
            if (hit) setVisible(hit[0]);
          }
        }
      },
      // Watch the pinned one-screen child: a threshold on the 430svh section
      // itself can never be met inside a single-screen viewport, so the readout
      // stayed stuck on the first variant.
      { threshold: 0.5 },
    );
    for (const [, id] of marks) {
      const el = document.getElementById(id)?.querySelector("[data-hero-pin]");
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  const current =
    visible === "A"
      ? { title: "A · кадры на canvas", note: "2.7 МБ · 96 кадров", stats: a }
      : visible === "B"
        ? { title: "B · видео, все кадры ключевые", note: "14 МБ", stats: b }
        : { title: "C · видео как сейчас", note: "3.7 МБ", stats: c };

  return (
    <>
      <Readout {...current} />

      <section id="sec-a">
        <Banner text="A · КАДРЫ НА CANVAS · 2.7 МБ" />
        <HeroFrameScrub onStats={onA} />
      </section>

      <section id="sec-b">
        <Banner text="B · ВИДЕО, ВСЕ КАДРЫ КЛЮЧЕВЫЕ · 14 МБ" />
        <VideoScrub
          label="hero-lab-intra"
          onStats={onB}
          src="/media/hero/hero-scroll-mobile-intra.mp4"
        />
      </section>

      <section id="sec-c">
        <Banner text="C · ВИДЕО КАК СЕЙЧАС · 3.7 МБ" />
        <VideoScrub
          label="hero-lab-current"
          onStats={onC}
          src="/media/hero/hero-scroll-mobile.mp4"
        />
      </section>

      <div className="bg-paper px-6 py-16 text-center">
        <p className="mono-meta text-muted">Конец стенда</p>
      </div>
    </>
  );
}

function Banner({ text }: { text: string }) {
  return (
    <p className="bg-ink px-4 py-3 text-center font-mono text-[0.7rem] tracking-[0.14em] text-white uppercase">
      {text}
    </p>
  );
}
