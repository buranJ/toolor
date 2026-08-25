"use client";

import Image from "next/image";
import { useState } from "react";

import type { ProductImage } from "@/types";

export function ResilientEditorialImage({
  images,
  className = "object-cover",
  priority = false,
  sizes,
  fallbackLabel = "TOOLOR / Kyrgyzstan",
}: {
  images: ProductImage[];
  className?: string;
  priority?: boolean;
  sizes: string;
  fallbackLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  const image = images[index];

  if (!image) {
    return (
      <div className="editorial-fallback">
        {/* Callers that already print the name over the tile pass an empty
            label, so the placeholder does not repeat it. */}
        {fallbackLabel ? (
          <span className="mono-meta">{fallbackLabel}</span>
        ) : null}
        <span className="bg-brand mt-auto h-1 w-14" aria-hidden="true" />
      </div>
    );
  }

  return (
    <Image
      alt={image.alt}
      className={className}
      fill
      onError={() => setIndex((value) => value + 1)}
      priority={priority}
      sizes={sizes}
      src={image.url}
    />
  );
}
