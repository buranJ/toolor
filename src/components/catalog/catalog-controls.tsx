"use client";

import Link from "next/link";
import { useRef } from "react";

import type { Category, Collection, ProductFilters } from "@/types";

interface CatalogControlsProps {
  categories: Category[];
  collections: Collection[];
  colors: string[];
  sizes: string[];
  filters: ProductFilters;
  resultCount: number;
}

function FilterFields({
  categories,
  collections,
  colors,
  sizes,
  filters,
}: Omit<CatalogControlsProps, "resultCount">) {
  return (
    <>
      <label className="filter-field">
        <span>Категория</span>
        <select defaultValue={filters.category ?? ""} name="category">
          <option value="">Все категории</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        <span>Пол</span>
        <select defaultValue={filters.gender ?? ""} name="gender">
          <option value="">Все</option>
          <option value="men">Мужской</option>
          <option value="women">Женский</option>
          <option value="unknown">Не указан</option>
        </select>
      </label>
      <label className="filter-field">
        <span>Размер</span>
        <select defaultValue={filters.size ?? ""} name="size">
          <option value="">Все</option>
          {sizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        <span>Цвет</span>
        <select defaultValue={filters.color ?? ""} name="color">
          <option value="">Все</option>
          {colors.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        <span>Коллекция</span>
        <select defaultValue={filters.collection ?? ""} name="collection">
          <option value="">Все</option>
          {collections.map((collection) => (
            <option key={collection.id} value={collection.slug}>
              {collection.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="filter-field">
          <span>Цена от</span>
          <input
            defaultValue={
              filters.minPrice === undefined ? "" : filters.minPrice / 100
            }
            inputMode="numeric"
            min="0"
            name="minPrice"
            placeholder="0"
            type="number"
          />
        </label>
        <label className="filter-field">
          <span>Цена до</span>
          <input
            defaultValue={
              filters.maxPrice === undefined ? "" : filters.maxPrice / 100
            }
            inputMode="numeric"
            min="0"
            name="maxPrice"
            placeholder="—"
            type="number"
          />
        </label>
      </div>
    </>
  );
}

function HiddenFilters({ filters }: { filters: ProductFilters }) {
  const values: Array<[string, string | number | undefined]> = [
    ["category", filters.category],
    ["gender", filters.gender],
    ["size", filters.size],
    ["color", filters.color],
    ["collection", filters.collection],
    ["q", filters.search],
    [
      "minPrice",
      filters.minPrice === undefined ? undefined : filters.minPrice / 100,
    ],
    [
      "maxPrice",
      filters.maxPrice === undefined ? undefined : filters.maxPrice / 100,
    ],
  ];

  return values
    .filter(
      (entry): entry is [string, string | number] =>
        entry[1] !== undefined && entry[1] !== "",
    )
    .map(([name, value]) => (
      <input key={name} name={name} type="hidden" value={value} />
    ));
}

function SortForm({ filters }: { filters: ProductFilters }) {
  return (
    <form action="/catalog" method="get">
      <HiddenFilters filters={filters} />
      <SortField autoSubmit value={filters.sort} />
    </form>
  );
}

export function CatalogControls(props: CatalogControlsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <div className="catalog-toolbar">
      <div className="flex items-center justify-between gap-4">
        <p className="mono-meta text-muted">
          {props.resultCount} <span className="hidden sm:inline">изделий</span>
        </p>

        <div className="flex items-end gap-2">
          <button
            className="toolbar-button lg:hidden"
            onClick={() => dialogRef.current?.showModal()}
            type="button"
          >
            Фильтры
          </button>
          <div className="lg:hidden">
            <SortForm filters={props.filters} />
          </div>

          <details className="group relative hidden lg:block">
            <summary className="toolbar-button cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              Фильтры <span aria-hidden="true">＋</span>
            </summary>
            <form
              action="/catalog"
              className="border-line bg-surface fixed top-24 right-10 z-[60] grid max-h-[calc(100vh-7rem)] w-[min(72rem,calc(100vw-5rem))] grid-cols-4 gap-4 overflow-y-auto rounded-[1.5rem] border p-6 shadow-[var(--shadow-card)]"
              method="get"
            >
              <label className="filter-field col-span-2">
                <span>Поиск</span>
                <input
                  defaultValue={props.filters.search}
                  name="q"
                  placeholder="Название или описание"
                  type="search"
                />
              </label>
              <FilterFields {...props} />
              <input name="sort" type="hidden" value={props.filters.sort} />
              <div className="border-line col-span-4 flex justify-end gap-3 border-t pt-5">
                <Link className="toolbar-button text-center" href="/catalog">
                  Сбросить
                </Link>
                <button
                  className="toolbar-button bg-brand text-white"
                  type="submit"
                >
                  Показать {props.resultCount}
                </button>
              </div>
            </form>
          </details>
          <div className="hidden lg:block">
            <SortForm filters={props.filters} />
          </div>
        </div>
      </div>

      <dialog className="filter-dialog" ref={dialogRef}>
        <form
          action="/catalog"
          className="bg-paper flex min-h-full flex-col"
          method="get"
        >
          <header className="border-line flex items-center justify-between border-b px-5 py-4">
            <p className="text-lg font-medium">Фильтры</p>
            <button
              aria-label="Закрыть фильтры"
              className="text-2xl"
              onClick={() => dialogRef.current?.close()}
              type="button"
            >
              ×
            </button>
          </header>
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
            <label className="filter-field">
              <span>Поиск</span>
              <input
                defaultValue={props.filters.search}
                name="q"
                placeholder="Название или описание"
                type="search"
              />
            </label>
            <SortField value={props.filters.sort} />
            <FilterFields {...props} />
          </div>
          <footer className="border-line bg-paper sticky bottom-0 grid grid-cols-2 gap-3 border-t p-5">
            <Link className="toolbar-button text-center" href="/catalog">
              Сбросить
            </Link>
            <button
              className="toolbar-button bg-brand text-white"
              type="submit"
            >
              Показать {props.resultCount}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}

function SortField({
  value,
  autoSubmit = false,
}: {
  value: ProductFilters["sort"];
  autoSubmit?: boolean;
}) {
  return (
    <label className="filter-field min-w-40">
      <span className="sr-only">Сортировка</span>
      <select
        aria-label="Сортировка"
        defaultValue={value}
        name="sort"
        onChange={
          autoSubmit
            ? (event) => event.currentTarget.form?.requestSubmit()
            : undefined
        }
      >
        <option value="featured">Рекомендуем</option>
        <option value="newest">Новинки</option>
        <option value="price-asc">Цена ↑</option>
        <option value="price-desc">Цена ↓</option>
      </select>
    </label>
  );
}
