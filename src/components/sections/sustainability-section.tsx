import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { Container } from "@/components/ui/container";
import { TextLink } from "@/components/ui/link";
import type { Product } from "@/types";

export function SustainabilitySection({ product }: { product?: Product }) {
  const images = product ? product.images : [];
  const rows = [
    ["01", "Материал", product?.material || "не указан в источнике"],
    ["02", "Уход", product?.care || "требует уточнения"],
    ["03", "Происхождение материалов", "данные не предоставлены"],
  ] as const;

  return (
    <section
      className="bg-paper py-20 md:py-28"
      data-scroll-anchor="sustainability"
    >
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="bg-frost-deep relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-[var(--shadow-soft)]">
            <ResilientEditorialImage
              images={images}
              sizes="(max-width: 1024px) 100vw, 50vw"
              fallbackLabel="Materials / TOOLOR"
            />
          </div>
          <div>
            <p className="eyebrow text-brand">Materials / Transparency</p>
            <h2 className="section-serif mt-5 max-w-[11ch]">
              Факты вместо обещаний
            </h2>
            <p className="text-muted mt-6 max-w-lg text-base leading-relaxed">
              В workbook заполнены не все сведения о составе и уходе. До
              подтверждения мы показываем источник данных честно и не добавляем
              экологические заявления.
            </p>
            <dl className="mt-10 overflow-hidden rounded-[1.5rem] bg-surface shadow-[var(--shadow-soft)]">
              {rows.map(([num, term, value], i) => (
                <div
                  key={num}
                  className={`grid grid-cols-[2.5rem_1fr] items-baseline gap-4 px-6 py-5 md:grid-cols-[3rem_9rem_1fr] ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <dt className="text-brand font-mono text-xs">{num}</dt>
                  <dt className="text-muted hidden text-sm md:block">{term}</dt>
                  <dd className="text-sm leading-relaxed md:text-base">
                    <span className="text-muted mb-1 block text-xs md:hidden">
                      {term}
                    </span>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <TextLink className="mt-8" href="/sustainability">
              Принципы раздела
            </TextLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
