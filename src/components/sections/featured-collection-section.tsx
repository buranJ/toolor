import { FeaturedCollectionSlider } from "@/components/sections/featured-collection-slider";
import { Container } from "@/components/ui/container";
import type { Product } from "@/types";

export function FeaturedCollectionSection({
  products,
}: {
  products: Product[];
}) {
  return (
    <section
      className="featured-collection-section overflow-hidden bg-white py-20 md:py-28"
      data-scroll-anchor="collection"
    >
      <Container>
        <div className="text-center">
          <p className="eyebrow text-brand"></p>
          <h2 className="section-serif mt-4">Рекомендуем</h2>
          <p className="text-muted mx-auto mt-4 max-w-lg text-sm leading-6">
            Вещи, с которых удобно собрать гардероб TOOLOR — от базовых моделей
            до акцентных.
          </p>
        </div>
      </Container>

      <FeaturedCollectionSlider products={products} />
    </section>
  );
}
