import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { MountainEdge } from "@/components/ui/mountain-edge";
import { instagramHandle, socialLinks } from "@/lib/config/social";
import type { ProductImage } from "@/types";

function InstagramGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="size-[1.15rem]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ModernNomadsSection({ images }: { images: ProductImage[] }) {
  return (
    <section
      className="bg-frost-deep relative min-h-[80svh] overflow-hidden text-white"
      data-scroll-anchor="modern-nomads"
    >
      <ResilientEditorialImage
        className="object-cover opacity-70"
        images={images}
        sizes="100vw"
        fallbackLabel="TOOLOR"
      />
      <div className="frost-scrim absolute inset-0" />
      <MountainEdge position="top" className="text-paper" />
      <MountainEdge position="bottom" className="text-paper" />

      <Container className="relative z-[3] flex min-h-[80svh] flex-col justify-center py-24 md:py-28">
        <div className="max-w-4xl">
          <p className="eyebrow flex items-center gap-2 text-white/75">
            <InstagramGlyph />
            Мы в Instagram
          </p>
          <h2 className="mt-6 font-serif text-[clamp(2.5rem,6.5vw,6.5rem)] leading-[1.02] font-medium text-balance">
            Город заканчивается.
            <br />
            <span className="serif-italic">Движение продолжается.</span>
          </h2>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-white/85">
            Маршруты, съёмки в горах и новые модели — каждую неделю в нашем
            Instagram. Подписывайтесь на {instagramHandle} и будьте ближе к
            движению.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <ButtonLink
              external
              href={socialLinks.instagram}
              variant="primary"
              size="lg"
            >
              <InstagramGlyph />
              Подписаться в Instagram
            </ButtonLink>
            {/* <span className="text-sm text-white/70">{instagramHandle}</span> */}
          </div>
        </div>
      </Container>
    </section>
  );
}
