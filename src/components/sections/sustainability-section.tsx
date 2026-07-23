import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { Container } from "@/components/ui/container";
import { TextLink } from "@/components/ui/link";
import { ScrollRevealMark } from "@/components/ui/scroll-reveal-mark";
import type { Product } from "@/types";

export function SustainabilitySection({ product }: { product?: Product }) {
  const images = product ? product.images : [];
  const rows = [
    ["Материал", product?.material || "Технологичные и натуральные ткани"],
    ["Уход", product?.care || "Простой уход, долгий срок службы"],
    ["Подход", "Функциональность и качество на каждый день"],
  ] as const;

  return (
    <section
      className="bg-paper relative overflow-hidden py-20 md:py-28"
      data-scroll-anchor="sustainability"
    >
      <ScrollRevealMark
        variant="grey"
        from="left"
        rotate={-6}
        targetOpacity={0.32}
        className="absolute -bottom-10 -left-12 z-0 w-44 md:w-60"
      />
      <Container className="relative z-10">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="bg-frost-deep relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-[var(--shadow-soft)]">
            <ResilientEditorialImage
              images={images}
              sizes="(max-width: 1024px) 100vw, 50vw"
              fallbackLabel="TOOLOR"
            />
          </div>
          <div>
            <p className="eyebrow text-brand">Материалы</p>
            <h2 className="section-serif mt-5 max-w-[11ch]">
              Сделано, чтобы служить
            </h2>
            <p className="text-muted mt-6 max-w-lg text-base leading-relaxed">
              Одежда для движения: продуманные материалы, чистые линии и вещи,
              которые служат долго — от города до открытого маршрута.
            </p>
            <dl className="mt-10 overflow-hidden rounded-[1.5rem] bg-surface shadow-[var(--shadow-soft)]">
              {rows.map(([term, value], i) => (
                <div
                  key={term}
                  className={`grid gap-1 px-6 py-5 md:grid-cols-[10rem_1fr] md:items-baseline md:gap-4 ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <dt className="text-muted text-sm">{term}</dt>
                  <dd className="text-sm leading-relaxed md:text-base">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <TextLink className="mt-8" href="/sustainability">
              Подробнее
            </TextLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
