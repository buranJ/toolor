import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { Container } from "@/components/ui/container";
import { TextLink } from "@/components/ui/link";
import { ScrollRevealMark } from "@/components/ui/scroll-reveal-mark";
import { getDictionary, localePath, type Locale } from "@/i18n";
import type { Product } from "@/types";

export function SustainabilitySection({
  locale,
  product,
}: {
  locale: Locale;
  product?: Product;
}) {
  const d = getDictionary(locale);
  const copy = d.home.sustainability;
  const images = product ? product.images : [];

  // Material and care come from the imported workbook and stay in their source
  // language; only the labels and the fallbacks are translated.
  const rows = [
    [copy.rowMaterial, product?.material || copy.defaultMaterial],
    [copy.rowCare, product?.care || copy.defaultCare],
    [copy.rowApproach, copy.approachValue],
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
            <p className="eyebrow text-brand">{copy.kicker}</p>
            <h2 className="section-serif mt-5 max-w-[11ch]">{copy.title}</h2>
            <p className="text-muted mt-6 max-w-lg text-base leading-relaxed">
              {copy.description}
            </p>
            <dl className="bg-surface mt-10 overflow-hidden rounded-[1.5rem] shadow-[var(--shadow-soft)]">
              {rows.map(([term, value], i) => (
                <div
                  key={term}
                  className={`grid gap-1 px-6 py-5 md:grid-cols-[10rem_1fr] md:items-baseline md:gap-4 ${i > 0 ? "border-line border-t" : ""}`}
                >
                  <dt className="text-muted text-sm">{term}</dt>
                  <dd className="text-sm leading-relaxed md:text-base">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <TextLink
              className="mt-8"
              href={localePath(locale, "/sustainability")}
            >
              {d.common.more}
            </TextLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
