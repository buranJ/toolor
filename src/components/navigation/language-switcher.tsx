"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

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

const SCROLL_KEY = "toolor:locale-switch-scroll";

/**
 * Swapping the locale changes the `[locale]` segment, so the whole layout
 * remounts and the router lands the visitor at the top of the new page. Stash
 * the offset on click and put it back once the translated page has rendered,
 * so a switch made half-way down a page stays half-way down.
 */
function useLocaleSwitchScroll() {
  useEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved === null) return;
    // Claim it immediately: the switcher renders in the header, the mobile
    // menu and the footer, and only one of them should restore.
    sessionStorage.removeItem(SCROLL_KEY);

    const target = Number(saved);
    if (!Number.isFinite(target) || target <= 0) return;

    // The translated page streams in, so the document can still be shorter
    // than the saved offset for a few frames. Retry until it fits.
    let frames = 0;
    let raf = requestAnimationFrame(function step() {
      window.scrollTo({ top: target, behavior: "instant" });
      if (Math.abs(window.scrollY - target) > 1 && frames++ < 90) {
        raf = requestAnimationFrame(step);
      }
    });

    return () => cancelAnimationFrame(raf);
  }, []);
}

function SwitcherLinks({
  locale,
  label,
  className = "",
  variant = "inline",
  query,
}: SwitcherProps & { query: string }) {
  const pathname = usePathname();
  useLocaleSwitchScroll();

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
                onClick={() => {
                  if (!isActive) {
                    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
                  }
                }}
                scroll={false}
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
