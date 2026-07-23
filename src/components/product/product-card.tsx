import Image from "next/image";
import Link from "next/link";

import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { formatMoney, getProductColorHex } from "@/lib/utils";
import type { Product } from "@/types";

import { WishlistToggle } from "./wishlist-toggle";

export function ProductCard({
  product,
  className = "",
  imagePriority = false,
  imageSizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  large = false,
  compact = false,
}: {
  product: Product;
  className?: string;
  imagePriority?: boolean;
  imageSizes?: string;
  large?: boolean;
  compact?: boolean;
}) {
  const image = product.images[0];
  const hoverImage = product.images[1];
  const colors = product.colors ?? [];
  const radius = large ? "rounded-[1.75rem]" : "rounded-[1.25rem]";

  return (
    <article
      className={`product-card group min-w-0 ${className}`}
      data-testid="product-card"
    >
      <div
        className={`relative overflow-hidden bg-white shadow-[var(--shadow-soft)] transition-shadow duration-300 group-hover:shadow-[var(--shadow-card)] ${radius}`}
      >
        <Link href={`/product/${product.slug}`} className="block">
          <div className="bg-stone relative aspect-[3/4] overflow-hidden">
            {image ? (
              <ResilientEditorialImage
                className="product-card-media object-cover group-hover:opacity-0"
                images={product.images}
                priority={imagePriority}
                sizes={imageSizes}
                fallbackLabel={product.productType ?? "TOOLOR"}
              />
            ) : (
              <span className="text-muted absolute inset-0 grid place-items-center px-5 text-center text-xs tracking-[0.14em] uppercase">
                Фото скоро появится
              </span>
            )}
            {hoverImage ? (
              <Image
                alt=""
                aria-hidden="true"
                className="product-card-media object-cover opacity-0 group-hover:opacity-100"
                fill
                sizes={imageSizes}
                src={hoverImage.url}
              />
            ) : null}
          </div>
        </Link>
        <div className="absolute top-3 right-3">
          <WishlistToggle productId={product.id} productName={product.name} />
        </div>
      </div>

      <div className={compact ? "px-1 pt-3" : "px-1.5 pt-4"}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted truncate text-xs tracking-[0.02em]">
            {product.productType ?? "TOOLOR"}
          </p>
          {!compact && colors.length ? (
            <span
              className="flex shrink-0 items-center gap-1"
              aria-label={`Цвета: ${colors.join(", ")}`}
            >
              {colors.slice(0, 4).map((color) => (
                <span
                  className="border-ink/15 size-3 rounded-full border"
                  key={color}
                  style={{
                    backgroundColor: getProductColorHex(color) ?? "#7b868c",
                  }}
                  title={color}
                />
              ))}
            </span>
          ) : null}
        </div>

        <div className="mt-1.5 flex items-start justify-between gap-3">
          <h3
            className={`min-w-0 leading-snug font-medium ${
              large
                ? "text-lg md:text-2xl"
                : compact
                  ? "text-sm"
                  : "text-[0.95rem] md:text-base"
            }`}
          >
            <Link
              className="hover:text-brand transition-colors"
              href={`/product/${product.slug}`}
            >
              {product.name}
            </Link>
          </h3>
          <p
            className={`shrink-0 font-semibold ${
              large ? "text-lg md:text-xl" : "text-[0.95rem] md:text-base"
            }`}
          >
            {formatMoney(product.price)}
          </p>
        </div>

        {!compact && product.material ? (
          <p className="text-muted mt-1 text-sm">{product.material}</p>
        ) : null}
      </div>
    </article>
  );
}
