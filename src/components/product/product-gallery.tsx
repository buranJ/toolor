"use client";

import type { TouchEvent } from "react";
import { useRef, useState, useSyncExternalStore } from "react";

import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import { ProductImageViewer } from "@/components/product/product-image-viewer";
import { format, getDictionary, type Locale } from "@/i18n";
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
  locale,
  productName,
  productType,
}: {
  images: ProductImage[];
  locale: Locale;
  productName: string;
  productType?: string;
}) {
  const d = getDictionary(locale);
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
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
        <span className="mono-meta text-white/55">{d.product.photosSoon}</span>
      </div>
    );
  }

  return (
    <div
      aria-label={d.product.galleryAria}
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
            aria-label={format(d.product.showImage, { index: index + 1 })}
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
        <button
          aria-label={d.product.zoomOpen}
          className="product-gallery-zoom"
          disabled={!isReady}
          onClick={() => setZoomed(true)}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5M11 8.2v5.6M8.2 11h5.6" />
          </svg>
        </button>
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
              aria-label={d.product.previousImage}
              disabled={!isReady}
              onClick={() => move(-1)}
              type="button"
            >
              ←
            </button>
            <button
              aria-label={d.product.nextImage}
              disabled={!isReady}
              onClick={() => move(1)}
              type="button"
            >
              →
            </button>
          </div>
        ) : null}
      </div>

      {zoomed ? (
        <ProductImageViewer
          d={d}
          images={visibleImages}
          index={activeIndex}
          onClose={() => setZoomed(false)}
          onMove={move}
        />
      ) : null}
    </div>
  );
}
