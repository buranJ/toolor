import { defaultLocale, isLocale, locales, type Locale } from "./config";

/**
 * Prefix an app-internal path with a locale segment. External URLs, hashes,
 * `mailto:` and already-prefixed paths are returned untouched so callers can
 * pass any `href` through without branching.
 */
export function localePath(locale: Locale, href: string): string {
  if (!href.startsWith("/")) return href;

  const segments = href.split("/");
  if (isLocale(segments[1])) return href;

  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

/** Split a pathname into its locale segment and the remaining path. */
export function splitLocale(pathname: string): {
  locale: Locale;
  rest: string;
} {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];

  if (!isLocale(maybeLocale)) {
    return { locale: defaultLocale, rest: pathname };
  }

  const rest = `/${segments.slice(2).join("/")}`;
  return { locale: maybeLocale, rest: rest === "/" ? "/" : rest };
}

/** Swap the locale segment of a pathname, preserving the rest of the route. */
export function switchLocalePath(pathname: string, next: Locale): string {
  const { rest } = splitLocale(pathname);
  return localePath(next, rest);
}

/** Every locale variant of a path — used to build `alternates.languages`. */
export function localeAlternates(href: string): Record<Locale, string> {
  return Object.fromEntries(
    locales.map((locale) => [locale, localePath(locale, href)]),
  ) as Record<Locale, string>;
}
