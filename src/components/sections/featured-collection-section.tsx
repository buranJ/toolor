import { FeaturedCollectionSlider } from "@/components/sections/featured-collection-slider";
import { Container } from "@/components/ui/container";
import { getDictionary, type Locale } from "@/i18n";
import type { Product } from "@/types";

export function FeaturedCollectionSection({
  locale,
  products,
}: {
  locale: Locale;
  products: Product[];
}) {
  const d = getDictionary(locale);
  const copy = d.home.featuredCollection;

  return (
    <section
      className="featured-collection-section overflow-hidden bg-white py-20 md:py-28"
      data-scroll-anchor="collection"
    >
      <Container>
        <div className="text-center">
          <h2 className="section-serif mt-4">{copy.title}</h2>
          <p className="text-muted mx-auto mt-4 max-w-lg text-sm leading-6">
            {copy.description}
          </p>
        </div>
      </Container>

      <FeaturedCollectionSlider locale={locale} products={products} />
    </section>
  );
}
