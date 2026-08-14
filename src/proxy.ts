import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";

const LOCALE_COOKIE = "toolor-locale";
/** Remember an explicit language choice for a year. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Pick the best locale from an `Accept-Language` header, honouring the client's
 * quality values. Falls back to the default when nothing matches.
 */
function localeFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      const quality = q ? Number.parseFloat(q.split("=")[1] ?? "1") : 1;
      return { tag: tag?.trim().toLowerCase() ?? "", quality };
    })
    .filter((entry) => entry.tag)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    // Match the primary subtag so "en-GB" and "ru-RU" resolve too.
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }

  return null;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const firstSegment = pathname.split("/")[1];
  if (isLocale(firstSegment)) {
    // Already localised — keep the cookie in step with what the visitor browses.
    const response = NextResponse.next();
    if (request.cookies.get(LOCALE_COOKIE)?.value !== firstSegment) {
      response.cookies.set(LOCALE_COOKIE, firstSegment, {
        maxAge: COOKIE_MAX_AGE,
        path: "/",
        sameSite: "lax",
      });
    }
    return response;
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : (localeFromAcceptLanguage(request.headers.get("accept-language")) ??
      defaultLocale);

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  url.search = search;

  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, the metadata routes and anything with a file
  // extension (images, fonts, videos in /public).
  matcher: [
    "/((?!_next|api|favicon.ico|robots.txt|sitemap.xml|.*\\.[\\w]+$).*)",
  ],
};

export { LOCALE_COOKIE, locales };
