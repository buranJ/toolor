import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { MountainEdge } from "@/components/ui/mountain-edge";
import type { ProductImage } from "@/types";

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
        fallbackLabel="Route 01 / Kyrgyzstan"
      />
      <div className="frost-scrim absolute inset-0" />
      <MountainEdge position="top" className="text-paper" />
      <MountainEdge position="bottom" className="text-surface" />

      <Container className="relative z-[3] flex min-h-[80svh] flex-col justify-center py-24 md:py-28">
        <div className="max-w-4xl">
          <p className="eyebrow text-white/75">Community of modern nomads</p>
          <h2 className="mt-6 font-serif text-[clamp(2.5rem,6.5vw,6.5rem)] leading-[1.02] font-medium text-balance">
            Город заканчивается.
            <br />
            <span className="serif-italic">Движение продолжается.</span>
          </h2>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-white/85">
            Короткое направление бренда для будущего манифеста. Финальный текст
            и ландшафтные материалы требуют редакционного подтверждения.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href="/about" variant="light-solid" size="lg" arrow>
              О направлении
            </ButtonLink>
            <span className="mono-meta text-white/70">
              ↑ N — 42.87° / 74.57°
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
