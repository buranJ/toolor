import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import type { ProductImage } from "@/types";

export interface HeroSectionContent {
  kicker: string;
  title: string;
  description: string;
  primaryCta: { href: string; label: string };
  secondaryCta: { href: string; label: string };
}

export function HeroMotionSlot({ images }: { images: ProductImage[] }) {
  return (
    <div
      className="absolute inset-0"
      data-motion-slot="hero-sequence"
      data-static-poster="true"
    >
      <ResilientEditorialImage
        className="object-cover object-[center_28%]"
        images={images}
        priority
        sizes="(max-width: 1024px) 100vw, 52vw"
        fallbackLabel="TOOLOR / Modern nomads"
      />
    </div>
  );
}

export function HeroMedia({ images }: { images: ProductImage[] }) {
  return <HeroMotionSlot images={images} />;
}

export function HeroContent({ content }: { content: HeroSectionContent }) {
  return (
    <div className="flex flex-col justify-center py-12 md:py-0 lg:pr-10">
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
        <ButtonLink href={content.secondaryCta.href} variant="secondary" size="lg">
          {content.secondaryCta.label}
        </ButtonLink>
      </div>
    </div>
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
      className="bg-paper relative overflow-hidden"
      data-motion-section="hero"
      data-motion-start="top top"
      data-motion-end="bottom top"
      data-scroll-anchor="hero"
    >
      <Container className="grid items-stretch gap-8 lg:grid-cols-2 lg:gap-14">
        <HeroContent content={content} />
        <div className="relative min-h-[24rem] overflow-hidden rounded-[2rem] bg-frost-deep md:min-h-[calc(100svh-8rem)] lg:mt-8 lg:mb-8">
          <HeroMedia images={images} />
        </div>
      </Container>
    </section>
  );
}
