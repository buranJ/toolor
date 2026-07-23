"use client";

import type { CSSProperties, TouchEvent } from "react";
import { useRef, useState } from "react";
import Link from "next/link";

import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { formatMoney } from "@/lib/utils";
import type { Product } from "@/types";

type SlideStyle = CSSProperties & {
  "--slide-offset": number;
  "--slide-depth": number;
};

function circularOffset(index: number, active: number, total: number) {
  let offset = index - active;
  const midpoint = Math.floor(total / 2);

  if (offset > midpoint) offset -= total;
  if (offset < -midpoint) offset += total;

  return offset;
}

export function FeaturedCollectionSlider({
  products,
}: {
  products: Product[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const total = products.length;

  if (!total) return null;

  const activeProduct = products[activeIndex] ?? products[0];

  function move(direction: -1 | 1) {
    setActiveIndex((current) => (current + direction + total) % total);
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;

    if (start === null || end === undefined || Math.abs(start - end) < 45) {
      return;
    }

    move(start > end ? 1 : -1);
  }

  return (
    <div
      aria-label="Подборка коллекции"
      aria-roledescription="карусель"
      className="featured-carousel mt-10 md:mt-14"
      data-testid="featured-carousel"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") move(-1);
        if (event.key === "ArrowRight") move(1);
      }}
      role="region"
      tabIndex={0}
    >
      <div
        className="featured-carousel-stage"
        onTouchEnd={handleTouchEnd}
        onTouchStart={handleTouchStart}
      >
        {products.map((product, index) => {
          const offset = circularOffset(index, activeIndex, total);
          const depth = Math.abs(offset);
          const isActive = index === activeIndex;
          const style: SlideStyle = {
            "--slide-offset": offset,
            "--slide-depth": depth,
            zIndex: total - depth,
          };

          return (
            <article
              aria-label={`${index + 1} из ${total}: ${product.name}`}
              className="featured-carousel-slide"
              data-active={isActive}
              key={product.id}
              style={style}
            >
              <div className="featured-carousel-media">
                <ResilientEditorialImage
                  images={product.images}
                  priority={isActive}
                  sizes="(max-width: 640px) 76vw, (max-width: 1024px) 48vw, 24rem"
                  fallbackLabel={product.productType ?? "TOOLOR"}
                />
                <div className="featured-carousel-scrim" />

                {isActive ? (
                  <Link
                    aria-label={`Открыть товар: ${product.name}`}
                    className="featured-carousel-active-link"
                    href={`/product/${product.slug}`}
                  >
                    <span className="featured-carousel-meta">
                      {product.productType ?? "TOOLOR"}
                    </span>
                    <strong>{product.name}</strong>
                    <span>{formatMoney(product.price)}</span>
                  </Link>
                ) : (
                  <button
                    aria-label={`Показать товар: ${product.name}`}
                    className="absolute inset-0 cursor-pointer"
                    onClick={() => setActiveIndex(index)}
                    type="button"
                  />
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div
        className="featured-carousel-dots"
        role="tablist"
        aria-label="Навигация по подборке"
      >
        {products.map((product, index) => (
          <button
            key={product.id}
            className="featured-carousel-dot"
            data-active={index === activeIndex}
            aria-label={`Показать: ${product.name}`}
            aria-current={index === activeIndex}
            onClick={() => setActiveIndex(index)}
            type="button"
          />
        ))}
      </div>

      <p className="sr-only" aria-live="polite">
        Активный товар: {activeProduct.name}
      </p>
    </div>
  );
}
