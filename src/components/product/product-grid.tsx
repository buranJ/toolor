import type { Product } from "@/types";

import { ProductCard } from "./product-card";

export function ProductGrid({
  products,
  className = "",
  prioritizeFirstRow = false,
}: {
  products: Product[];
  className?: string;
  prioritizeFirstRow?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-y-16 lg:gap-x-6 xl:grid-cols-4 ${className}`}
    >
      {products.map((product, index) => (
        <ProductCard
          imagePriority={prioritizeFirstRow && index < 4}
          key={product.id}
          product={product}
        />
      ))}
    </div>
  );
}
