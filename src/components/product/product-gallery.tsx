"use client";

import type { TouchEvent } from "react";
import { useRef, useState, useSyncExternalStore } from "react";

import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import type { ProductImage } from "@/types";

function rotateImages(images: ProductImage[], index: number) {
  return [...images.slice(index), ...images.slice(0, index)];
}

const subscribeToHydration = () => () => undefined;

function useIsHydrated() {
  return useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
}

export function ProductGallery({
  images,
  productName,
  productType,
}: {
  images: ProductImage[];
  productName: string;
  productType?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const isReady = useIsHydrated();
  const touchStartX = useRef<number | null>(null);
  const visibleImages = images.slice(0, 8);
  const activeImage = visibleImages[activeIndex];

  function move(direction: -1 | 1) {
    if (!visibleImages.length) return;
    setActiveIndex(
      (current) =>
        (current + direction + visibleImages.length) % visibleImages.length,
    );
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

  if (!activeImage) {
    return (
      <div className="editorial-fallback relative min-h-[30rem]">
        <span className="mono-meta">{productName}</span>
        <span className="mono-meta text-white/55">Фото скоро появятся</span>
      </div>
    );
  }

  return (
    <div
      aria-label="Галерея товара"
      className="product-gallery"
      data-gallery-ready={isReady}
      data-zoom-ready="true"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") move(-1);
        if (event.key === "ArrowRight") move(1);
      }}
      role="region"
      tabIndex={0}
    >
      <div className="product-gallery-thumbnails">
        {visibleImages.map((image, index) => (
          <button
            aria-current={index === activeIndex ? "true" : undefined}
            aria-label={`Показать изображение ${index + 1}`}
            className="product-gallery-thumbnail"
            disabled={!isReady}
            key={image.id}
            onClick={() => setActiveIndex(index)}
            type="button"
          >
            <ResilientEditorialImage
              images={rotateImages(visibleImages, index)}
              sizes="80px"
            />
            <span aria-hidden="true">0{index + 1}</span>
          </button>
        ))}
      </div>

      <div
        className="product-gallery-main"
        onTouchEnd={handleTouchEnd}
        onTouchStart={handleTouchStart}
      >
        <ResilientEditorialImage
          images={rotateImages(visibleImages, activeIndex)}
          key={activeImage.id}
          priority
          sizes="(max-width: 1023px) 100vw, 58vw"
        />
        <div aria-hidden="true" className="product-gallery-main-scrim" />
        <p className="product-gallery-route">
          TOOLOR / {productType ?? "PRODUCT"}
        </p>
        <p className="product-gallery-count" aria-live="polite">
          {String(activeIndex + 1).padStart(2, "0")} /{" "}
          {String(visibleImages.length).padStart(2, "0")}
        </p>
        {visibleImages.length > 1 ? (
          <div className="product-gallery-arrows">
            <button
              aria-label="Предыдущее изображение"
              disabled={!isReady}
              onClick={() => move(-1)}
              type="button"
            >
              ←
            </button>
            <button
              aria-label="Следующее изображение"
              disabled={!isReady}
              onClick={() => move(1)}
              type="button"
            >
              →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
