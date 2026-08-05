import { HeroScrollVideo } from "./hero-scroll-video";

export interface HeroSectionContent {
  kicker: string;
  title: string;
  description: string;
  primaryCta: { href: string; label: string };
  secondaryCta: { href: string; label: string };
}

export function HeroSection({ content }: { content: HeroSectionContent }) {
  return (
    <section
      aria-label="TOOLOR — Modern Nomads"
      className="relative"
      data-scroll-anchor="hero"
    >
      {/* Responsive full-bleed scroll scene. Mobile receives a dedicated
          portrait encode; desktop receives the wide master. */}
      <HeroScrollVideo
        content={content}
        className="-mt-[var(--header-height)]"
      />
    </section>
  );
}
