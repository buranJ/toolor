"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { ResilientEditorialImage } from "@/components/media/resilient-editorial-image";
import type { ProductImage } from "@/types";

/** Fetch the alternate photo on real interaction, not for every off-screen card. */
export function ProductCardMedia({
  href,
  images,
  priority,
  sizes,
  fallbackLabel,
  photoSoon,
}: {
  href: string;
  images: ProductImage[];
  priority: boolean;
  sizes: string;
  fallbackLabel: string;
  photoSoon: string;
}) {
  const [requested, setRequested] = useState(false);
  const [active, setActive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const alternate = images[1];
  function activate() {
    setRequested(true);
    setActive(true);
  }
  return (
    <Link
      className="block"
      href={href}
      onFocus={activate}
      onBlur={() => setActive(false)}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") activate();
      }}
      onPointerLeave={() => setActive(false)}
    >
      <div className="bg-stone relative aspect-[3/4] overflow-hidden">
        {images.length ? (
          <ResilientEditorialImage
            className="product-card-media object-cover"
            images={images}
            priority={priority}
            sizes={sizes}
            fallbackLabel={fallbackLabel}
          />
        ) : (
          <span className="text-muted absolute inset-0 grid place-items-center px-5 text-center text-xs tracking-[0.14em] uppercase">
            {photoSoon}
          </span>
        )}
        {requested && alternate && !failed ? (
          <Image
            alt=""
            aria-hidden="true"
            fill
            sizes={sizes}
            src={alternate.url}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={`product-card-media object-cover ${active && loaded ? "opacity-100" : "opacity-0"}`}
          />
        ) : null}
      </div>
    </Link>
  );
}
