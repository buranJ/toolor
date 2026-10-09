import Link from "next/link";

import { format, getDictionary, type Locale } from "@/i18n";
import type { ProductFilters } from "@/types";

/** Server-rendered links: navigation still works without JavaScript. */
export function Pagination({
  locale,
  pathname,
  filters,
  page,
  totalPages,
}: {
  locale: Locale;
  pathname: string;
  filters: ProductFilters;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const d = getDictionary(locale).common.pagination;
  const query = new URLSearchParams();
  const values = {
    category: filters.category,
    gender: filters.gender,
    size: filters.size,
    color: filters.color,
    collection: filters.collection,
    q: filters.search,
    sort: filters.sort,
    minPrice:
      filters.minPrice === undefined ? undefined : filters.minPrice / 100,
    maxPrice:
      filters.maxPrice === undefined ? undefined : filters.maxPrice / 100,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const href = (target: number) => {
    const params = new URLSearchParams(query);
    params.set("page", String(target));
    return `${pathname}?${params}`;
  };
  // Bound the link count even when the real catalogue grows to many pages.
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) =>
      Math.min(Math.max(1, page - 2), Math.max(1, totalPages - 4)) + index,
  );
  return (
    <nav
      aria-label={d.label}
      className="mt-12 flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link className="toolbar-button" href={href(page - 1)} rel="prev">
          {d.previous}
        </Link>
      ) : null}
      {pages.map((target) => (
        <Link
          key={target}
          aria-current={target === page ? "page" : undefined}
          aria-label={format(d.page, { page: target })}
          className={`toolbar-button ${target === page ? "toolbar-button-primary" : ""}`}
          href={href(target)}
        >
          {target}
        </Link>
      ))}
      {page < totalPages ? (
        <Link className="toolbar-button" href={href(page + 1)} rel="next">
          {d.next}
        </Link>
      ) : null}
      <p className="text-muted mt-2 w-full text-center text-sm">
        {format(d.status, { page, total: totalPages })}
      </p>
    </nav>
  );
}
