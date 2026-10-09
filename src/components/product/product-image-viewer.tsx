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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPointer = useRef(false);
  const image = images[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog?.showModal();
    dialog?.querySelector<HTMLButtonElement>("button")?.focus();

    // Hold the page still behind the overlay without letting the scrollbar's
    // disappearance shift the layout underneath.
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    return () => {
      dialog?.close();
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  if (!image) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-label={d.product.zoomAria}
      aria-modal="true"
      className="product-viewer"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        backdropPointer.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (backdropPointer.current && event.target === event.currentTarget)
          onClose();
        backdropPointer.current = false;
      }}
      onKeyDown={(event) => {
        // Do not also move the gallery underneath the modal.
        event.stopPropagation();
        if (event.key === "Tab") {
          const buttons = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          ];
          // Safari can skip buttons entirely depending on the system keyboard
          // setting. Cycle explicitly, not just at the last/first boundary.
          event.preventDefault();
          const current = buttons.findIndex(
            (button) => button === document.activeElement,
          );
          const next =
            (current + (event.shiftKey ? -1 : 1) + buttons.length) %
            buttons.length;
          buttons[next]?.focus();
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onMove(-1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          onMove(1);
        }
      }}
    >
      <button
        aria-label={d.product.zoomClose}
        className="product-viewer-close"
        onClick={onClose}
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
    </dialog>
  );
}
