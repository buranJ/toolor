import Link from "next/link";

import { format, getDictionary, localePath, type Locale } from "@/i18n";
import { formatMoney, getProductColorHex } from "@/lib/utils";
import type { Product } from "@/types";

import { WishlistToggle } from "./wishlist-toggle";
import { ProductCardMedia } from "./product-card-media";

export function ProductCard({
  locale,
  product,
  className = "",
  imagePriority = false,
  imageSizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  large = false,
  compact = false,
}: {
  locale: Locale;
  product: Product;
  className?: string;
  imagePriority?: boolean;
  imageSizes?: string;
  large?: boolean;
  compact?: boolean;
}) {
  const d = getDictionary(locale);
  const colors = product.colors ?? [];
  const radius = large ? "rounded-[1.75rem]" : "rounded-[1.25rem]";
  const href = localePath(locale, `/product/${product.slug}`);

  return (
    <article
      className={`product-card group min-w-0 ${className}`}
      data-testid="product-card"
    >
      <div
        className={`relative overflow-hidden bg-white shadow-[var(--shadow-soft)] transition-shadow duration-300 group-hover:shadow-[var(--shadow-card)] ${radius}`}
      >
        <ProductCardMedia
          href={href}
          images={product.images}
          priority={imagePriority}
          sizes={imageSizes}
          fallbackLabel={product.productType ?? "TOOLOR"}
          photoSoon={d.product.photoSoon}
        />
        <div className="absolute top-3 right-3">
          <WishlistToggle
            locale={locale}
            productId={product.id}
            productName={product.name}
          />
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
              aria-label={format(d.product.colorsAria, {
                colors: colors.join(", "),
              })}
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

        {/* Stacked on phones so the clamped name gets the full card width. */}
        <div className="mt-1.5 flex items-start justify-between gap-1 max-sm:flex-col sm:gap-3">
          <h3
            className={`line-clamp-2 min-w-0 leading-snug font-medium ${
              large
                ? "text-lg md:text-2xl"
                : compact
                  ? "text-sm"
                  : "text-[0.95rem] md:text-base"
            }`}
          >
            <Link
              className="hover:text-brand transition-colors"
              href={href}
              title={product.name}
            >
              {product.name}
            </Link>
          </h3>
          <p
            className={`shrink-0 font-semibold ${
              large ? "text-lg md:text-xl" : "text-[0.95rem] md:text-base"
            }`}
          >
            {product.priceStatus === "unknown"
              ? d.product.priceOnRequest
              : formatMoney(product.price, locale)}
          </p>
        </div>

        {!compact && product.material ? (
          <p className="text-muted mt-1 line-clamp-2 text-sm">
            {product.material}
          </p>
        ) : null}
      </div>
    </article>
  );
}
