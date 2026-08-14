"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { WishlistToggle } from "@/components/product/wishlist-toggle";
import {
  LOCAL_CART_KEY,
  readLocalCart,
  writeLocalCart,
} from "@/features/cart/local-cart";
import { format, getDictionary, type Locale } from "@/i18n";
import { formatMoney, getProductColorHex } from "@/lib/utils";
import type { Product } from "@/types";

type PurchaseProduct = Pick<
  Product,
  "id" | "slug" | "name" | "images" | "variants" | "colors"
>;

export function ProductPurchasePanel({
  locale,
  product,
}: {
  locale: Locale;
  product: PurchaseProduct;
}) {
  const d = getDictionary(locale);
  const panelRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState(product.variants[0]?.id ?? "");
  const [selectedColor, setSelectedColor] = useState(
    product.variants[0]?.options.color ?? product.colors?.[0] ?? "",
  );
  const [added, setAdded] = useState(false);
  const variant = useMemo(
    () => product.variants.find((item) => item.id === selectedId),
    [product.variants, selectedId],
  );
  const sizeVariants = useMemo(() => {
    const matchingColor = product.variants.filter(
      (item) => !selectedColor || item.options.color === selectedColor,
    );
    const candidates = matchingColor.length ? matchingColor : product.variants;
    // Some imported products carry a size-less duplicate variant whose title
    // is just the colour name — hide it whenever real sizes exist.
    const sized = candidates.filter((item) => item.options.size);
    const pool = sized.length ? sized : candidates;
    const unique = new Map<string, (typeof pool)[number]>();

    pool.forEach((item) => {
      const label = item.options.size ?? item.title;
      if (!unique.has(label)) unique.set(label, item);
    });

    return [...unique.values()];
  }, [product.variants, selectedColor]);

  useEffect(() => {
    if (panelRef.current) panelRef.current.dataset.purchaseReady = "true";
  }, []);

  function addToCart() {
    if (!variant) return;
    const cart = readLocalCart(window.localStorage.getItem(LOCAL_CART_KEY));
    const existing = cart.find((item) => item.variantId === variant.id);
    const next = existing
      ? cart.map((item) =>
          item.variantId === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      : [
          ...cart,
          {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            variantId: variant.id,
            variantTitle: variant.title,
            quantity: 1,
            unitAmount: variant.price.amount,
            currencyCode: "KGS" as const,
            imageUrl: product.images[0]?.url,
            imageUrls: product.images.map((image) => image.url),
          },
        ];
    writeLocalCart(next);
    const drawer = document.querySelector<HTMLDialogElement>(".cart-drawer");
    if (drawer && !drawer.open) drawer.showModal();
    window.dispatchEvent(new Event("toolor-cart-open"));
    setAdded(true);
  }

  function chooseColor(color: string) {
    setSelectedColor(color);
    setAdded(false);

    const currentSize = variant?.options.size;
    const matchingVariant =
      product.variants.find(
        (item) =>
          item.options.color === color && item.options.size === currentSize,
      ) ?? product.variants.find((item) => item.options.color === color);

    if (matchingVariant) setSelectedId(matchingVariant.id);
  }

  if (!variant) return null;

  return (
    <div
      className="product-purchase"
      data-purchase-ready="false"
      ref={panelRef}
    >
      <fieldset className="product-option-group">
        <div className="product-option-heading">
          <legend>{d.product.color}</legend>
          <span>{selectedColor}</span>
        </div>
        {product.colors?.length ? (
          <div className="product-color-swatches">
            {product.colors.map((color) => {
              const swatchColor = getProductColorHex(color);

              return (
                <label
                  className="product-color-swatch"
                  key={color}
                  style={
                    {
                      "--swatch-color": swatchColor ?? "#d9dcde",
                    } as React.CSSProperties
                  }
                  title={color}
                >
                  <input
                    checked={selectedColor === color}
                    className="sr-only"
                    name="color"
                    onChange={() => chooseColor(color)}
                    type="radio"
                  />
                  <span aria-hidden="true" />
                  <span className="sr-only">{color}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="product-color-missing" aria-label={d.product.color}>
            <span aria-hidden="true" />
            <p>{d.product.oneColor}</p>
          </div>
        )}
      </fieldset>

      <fieldset className="product-option-group">
        <div className="product-option-heading">
          <legend>{d.catalog.size}</legend>
          <span id="size-guide-note">{d.product.sizeGuide}</span>
        </div>
        <div className="product-size-options">
          {sizeVariants.map((item) => (
            <label className="product-size-option" key={item.id}>
              <input
                checked={selectedId === item.id}
                className="sr-only"
                name="variant"
                onChange={() => {
                  setSelectedId(item.id);
                  if (item.options.color) setSelectedColor(item.options.color);
                  setAdded(false);
                }}
                type="radio"
              />
              {item.options.size ?? item.title}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="product-availability">
        <span aria-hidden="true" style={{ background: "#2f9e44" }} />
        {d.product.inStock}
      </p>

      <div className="product-purchase-actions hidden md:flex">
        <button
          className="product-add-button"
          onClick={addToCart}
          type="button"
        >
          {added
            ? d.product.added
            : format(d.product.addToCartPrice, {
                price: formatMoney(variant.price, locale),
              })}
        </button>
        <WishlistToggle
          locale={locale}
          productId={product.id}
          productName={product.name}
        />
      </div>

      <div className="product-service-grid">
        <ServiceItem
          detail={d.product.service.deliveryDetail}
          icon={<TruckIcon />}
          title={d.product.service.deliveryTitle}
        />
        <ServiceItem
          detail={d.product.service.returnsDetail}
          icon={<ReturnIcon />}
          title={d.product.service.returnsTitle}
        />
        <ServiceItem
          detail={d.product.service.paymentDetail}
          icon={<ShieldIcon />}
          title={d.product.service.paymentTitle}
        />
      </div>

      <div className="border-line bg-paper/95 fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t p-3 backdrop-blur-md md:hidden">
        <button
          className="product-add-button min-h-12 flex-1"
          onClick={addToCart}
          type="button"
        >
          {added
            ? d.product.added
            : format(d.product.addToCartPrice, {
                price: formatMoney(variant.price, locale),
              })}
        </button>
        <WishlistToggle
          locale={locale}
          productId={product.id}
          productName={product.name}
        />
      </div>
      <span aria-live="polite" className="sr-only">
        {added
          ? format(d.product.addedAnnouncement, { name: product.name })
          : ""}
      </span>
    </div>
  );
}

function ServiceItem({
  detail,
  icon,
  title,
}: {
  detail: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="product-service-item">
      <span className="product-service-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function TruckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3.5 6.5h10.25v9.25H3.5z" />
      <path d="M13.75 9.75h3.2l3.55 3.55v2.45h-6.75" />
      <path d="M5.75 18.25a1.75 1.75 0 1 0 3.5 0 1.75 1.75 0 0 0-3.5 0ZM16.25 18.25a1.75 1.75 0 1 0 3.5 0 1.75 1.75 0 0 0-3.5 0Z" />
      <path d="M9.25 18.25h7" />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 7h10l-2.5-2.5M17 7l-2.5 2.5" />
      <path d="M17 17H7l2.5 2.5M7 17l2.5-2.5" />
      <path d="M5.25 9.75v4.5M18.75 14.25v-4.5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3.5 5.5 6.25v4.85c0 4.2 2.55 7.3 6.5 9.4 3.95-2.1 6.5-5.2 6.5-9.4V6.25L12 3.5Z" />
      <path d="m8.9 12.1 2 2 4.35-4.35" />
    </svg>
  );
}
