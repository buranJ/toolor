"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { WishlistToggle } from "@/components/product/wishlist-toggle";
import {
  LOCAL_CART_KEY,
  readLocalCart,
  writeLocalCart,
} from "@/features/cart/local-cart";
import { formatMoney, getProductColorHex } from "@/lib/utils";
import type { Product } from "@/types";

type PurchaseProduct = Pick<
  Product,
  "id" | "slug" | "name" | "images" | "variants" | "colors"
>;

export function ProductPurchasePanel({
  product,
}: {
  product: PurchaseProduct;
}) {
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
    const unique = new Map<string, (typeof candidates)[number]>();

    candidates.forEach((item) => {
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
          <legend>Цвет</legend>
          <span>{selectedColor || "Не указан в источнике"}</span>
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
                      "--swatch-color": swatchColor ?? "#d9d7d1",
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
          <div
            className="product-color-missing"
            aria-label="Цвет не указан в источнике"
          >
            <span aria-hidden="true">?</span>
            <p>Цвет не указан в исходном каталоге</p>
          </div>
        )}
      </fieldset>

      <fieldset className="product-option-group">
        <div className="product-option-heading">
          <legend>Размер</legend>
          <span id="size-guide-note">Таблица размеров недоступна</span>
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
        <span aria-hidden="true" />
        Наличие требует подтверждения
      </p>

      <div className="product-purchase-actions hidden md:flex">
        <button
          className="product-add-button"
          onClick={addToCart}
          type="button"
        >
          <BagIcon />
          {added ? "Добавлено ✓" : `В корзину · ${formatMoney(variant.price)}`}
        </button>
        <WishlistToggle productId={product.id} productName={product.name} />
      </div>

      <div className="product-service-grid">
        <ServiceItem
          detail="Условия требуют подтверждения"
          icon={<TruckIcon />}
          title="Доставка"
        />
        <ServiceItem
          detail="Политика не указана"
          icon={<ReturnIcon />}
          title="Возврат"
        />
        <ServiceItem
          detail="Подключение ожидается"
          icon={<ShieldIcon />}
          title="Оплата"
        />
      </div>

      <div className="border-line bg-paper/95 fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t p-3 backdrop-blur-md md:hidden">
        <button
          className="product-add-button min-h-12 flex-1"
          onClick={addToCart}
          type="button"
        >
          <BagIcon />
          {added ? "Добавлено ✓" : `В корзину · ${formatMoney(variant.price)}`}
        </button>
        <WishlistToggle productId={product.id} productName={product.name} />
      </div>
      <span aria-live="polite" className="sr-only">
        {added ? `${product.name} добавлен в корзину` : ""}
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
      {icon}
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

function BagIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6.5 8.5h11l1 11h-13l1-11Z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M8 7H5v-3" />
      <path d="M5 7a8 8 0 1 1-1 8" />
      <path d="M9 10h7v7H9z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
