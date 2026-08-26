"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import type { Dictionary } from "@/i18n";
import type { ProductImage } from "@/types";

/**
 * Full-frame viewer for a product photo.
 *
 * The gallery and the cards fit their photos with `cover` so the grid stays
 * flush, which crops whatever does not match the box — supplier photography
 * arrives in 3:4, 4:5, 2:3 and square. This shows the frame whole: `contain`
 * against a dark backdrop, with the same arrow navigation as the gallery.
 */
export function ProductImageViewer({
  images,
  index,
  onClose,
  onMove,
  d,
}: {
  images: ProductImage[];
  index: number;
  onClose: () => void;
  onMove: (direction: -1 | 1) => void;
  d: Dictionary;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const image = images[index];

  useEffect(() => {
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onMove(-1);
      if (event.key === "ArrowRight") onMove(1);
    };
    document.addEventListener("keydown", onKey);

    // Hold the page still behind the overlay without letting the scrollbar's
    // disappearance shift the layout underneath.
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    return () => {
      document.removeEventListener("keydown", onKey);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [onClose, onMove]);

  if (!image) return null;

  return (
    <div
      aria-label={d.product.zoomAria}
      aria-modal="true"
      className="product-viewer"
      onClick={onClose}
      role="dialog"
    >
      <button
        aria-label={d.product.zoomClose}
        className="product-viewer-close"
        onClick={onClose}
        ref={closeRef}
        type="button"
      >
        ✕
      </button>

      <div
        className="product-viewer-stage"
        // The stage swallows the click so only the backdrop closes the viewer.
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          alt={image.alt}
          className="product-viewer-image"
          fill
          priority
          sizes="100vw"
          src={image.url}
        />
      </div>

      {images.length > 1 ? (
        <div
          className="product-viewer-nav"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            aria-label={d.product.previousImage}
            onClick={() => onMove(-1)}
            type="button"
          >
            ←
          </button>
          <span aria-live="polite">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(images.length).padStart(2, "0")}
          </span>
          <button
            aria-label={d.product.nextImage}
            onClick={() => onMove(1)}
            type="button"
          >
            →
          </button>
        </div>
      ) : null}
    </div>
  );
}
