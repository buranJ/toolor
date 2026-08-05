import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import type { ProductImage } from "@/types";

import { HeroScrollVideo } from "./hero-scroll-video";

export interface HeroSectionContent {
  kicker: string;
  title: string;
  description: string;
  primaryCta: { href: string; label: string };
  secondaryCta: { href: string; label: string };
}

export function HeroMedia({ images }: { images: ProductImage[] }) {
  return (
    <div className="absolute inset-0" data-static-poster="true">
      <ResilientEditorialImage
        className="object-cover object-[center_28%]"
        images={images}
        priority
        sizes="100vw"
        fallbackLabel="TOOLOR / Modern nomads"
      />
    </div>
  );
}

export function HeroContent({ content }: { content: HeroSectionContent }) {
  return (
    <div className="flex flex-col justify-center py-12">
      <p className="eyebrow text-brand">{content.kicker}</p>
      <h1 className="display-serif mt-6 max-w-[14ch] text-balance">
        {content.title}
      </h1>
      <p className="text-muted mt-7 max-w-md text-base leading-relaxed md:text-lg">
        {content.description}
      </p>
      <div className="mt-9 flex flex-wrap items-center gap-3">
        <ButtonLink href={content.primaryCta.href} variant="primary" size="lg">
          {content.primaryCta.label}
        </ButtonLink>
        <ButtonLink
          href={content.secondaryCta.href}
          variant="secondary"
          size="lg"
        >
          {content.secondaryCta.label}
        </ButtonLink>
      </div>
    </div>
  );
}

/** Static two-part Hero shown below 1024px (no scroll scrubbing). */
function HeroFallback({
  content,
  images,
}: {
  content: HeroSectionContent;
  images: ProductImage[];
}) {
  return (
    <Container className="grid items-stretch gap-8 lg:gap-14">
      <HeroContent content={content} />
      <div className="bg-frost-deep relative min-h-[24rem] overflow-hidden rounded-[2rem] md:min-h-[calc(100svh-10rem)]">
        <HeroMedia images={images} />
      </div>
    </Container>
  );
}

export function HeroSection({
  content,
  images,
}: {
  content: HeroSectionContent;
  images: ProductImage[];
}) {
  return (
    <section
      aria-label="TOOLOR — Modern Nomads"
      className="relative"
      data-scroll-anchor="hero"
    >
      {/* Desktop: full-bleed scroll-controlled cinematic video.
          Pulled up under the sticky header so it is flush from scroll 0. */}
      <HeroScrollVideo
        content={content}
        className="hidden lg:-mt-[var(--header-height)] lg:block"
      />

      {/* Tablet / mobile: static fallback Hero */}
      <div className="bg-paper overflow-hidden pb-6 lg:hidden">
        <HeroFallback content={content} images={images} />
      </div>
    </section>
  );
}
