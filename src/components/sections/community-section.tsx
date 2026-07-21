import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { Container } from "@/components/ui/container";
import { TextLink } from "@/components/ui/link";
import type { ProductImage } from "@/types";

export function CommunitySection({ images }: { images: ProductImage[] }) {
  return (
    <section className="bg-surface py-20 md:py-28" data-scroll-anchor="community">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[1.5fr_0.8fr] lg:items-stretch">
          <div className="bg-frost-deep relative min-h-[30rem] overflow-hidden rounded-[2rem] shadow-[var(--shadow-soft)] md:min-h-[48rem]">
            <ResilientEditorialImage
              images={images}
              sizes="(max-width: 1024px) 100vw, 66vw"
              fallbackLabel="Field journal / TOOLOR"
            />
            <div className="absolute bottom-6 left-6 rounded-full bg-white/85 px-4 py-2 text-xs font-medium text-ink backdrop-blur-sm">
              Field journal / Content pending
            </div>
          </div>

          <div className="flex flex-col justify-between lg:py-6">
            <div>
              <p className="eyebrow text-brand">Community</p>
              <h2 className="section-serif mt-5 max-w-[14ch]">
                Маршрут начинается со встречи
              </h2>
              <p className="text-muted mt-6 max-w-md text-base leading-relaxed">
                Место для проверенных историй о людях, горах и движении. Мы не
                публикуем вымышленные события или партнёрства.
              </p>
            </div>
            <div className="mt-12 rounded-[1.5rem] bg-paper p-6">
              <p className="text-muted text-sm">Записей в журнале: 0</p>
              <TextLink className="mt-4" href="/community">
                Открыть журнал
              </TextLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
