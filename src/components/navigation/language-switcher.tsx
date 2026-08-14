"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import {
  localeNames,
  localeShortNames,
  locales,
  switchLocalePath,
  type Locale,
} from "@/i18n";

type SwitcherProps = {
  locale: Locale;
  label: string;
  className?: string;
  variant?: "inline" | "stacked";
};

function SwitcherLinks({
  locale,
  label,
  className = "",
  variant = "inline",
  query,
}: SwitcherProps & { query: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={label}
      className={`language-switcher language-switcher-${variant} ${className}`}
    >
      <ul>
        {locales.map((target) => {
          const href = switchLocalePath(pathname, target);
          const isActive = target === locale;

          return (
            <li key={target}>
              <Link
                aria-current={isActive ? "true" : undefined}
                data-active={isActive}
                href={query ? `${href}?${query}` : href}
                hrefLang={target}
                lang={target}
              >
                <abbr title={localeNames[target]}>
                  {localeShortNames[target]}
                </abbr>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Carries the current query string across the language swap, so catalog
 *  filters and search terms survive. */
function QueryAwareSwitcher(props: SwitcherProps) {
  const searchParams = useSearchParams();
  return <SwitcherLinks {...props} query={searchParams.toString()} />;
}

/**
 * Language switcher. Renders one real link per locale pointing at the current
 * route in that language, so it works without JavaScript and search engines can
 * follow every translation.
 *
 * `useSearchParams` opts a route out of static prerendering, and this component
 * sits in the header on every page — so the query-aware variant lives behind a
 * Suspense boundary whose fallback is the same switcher without the query. The
 * pages stay static and the links upgrade once hydrated.
 */
export function LanguageSwitcher(props: SwitcherProps) {
  return (
    <Suspense fallback={<SwitcherLinks {...props} query="" />}>
      <QueryAwareSwitcher {...props} />
    </Suspense>
  );
}
