import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import { notFound } from "next/navigation";

import { BrandPreloader } from "@/components/layout/brand-preloader";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { CartDrawer } from "@/components/cart/cart-drawer";
import {
  getDictionary,
  isLocale,
  localeAlternates,
  localeHtmlLang,
  localeOpenGraph,
  locales,
  type Locale,
} from "@/i18n";
import { siteConfig } from "@/lib/config/site";

import "../globals.css";

// Brand typeface is TT Commons Pro — self-hosted WOFF2 via @font-face in
// globals.css (--font-brand). Manrope is the swap fallback grotesk (closest
// geometric match with Cyrillic support) shown while the brand font loads.
const brandFallback = Manrope({
  variable: "--font-brand-fallback",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Paints the browser's own chrome — the status bar on Android, the toolbar tint
 * in Yandex Browser. It was left to the manifest's brand blue, which framed the
 * light page in a blue band; this matches the header instead.
 */
export const viewport: Viewport = {
  themeColor: "#ffffff",
};

/**
 * The scrubber's first loading pass: every eighth frame. Enough to drive the
 * whole scroll coarsely, so the hero responds long before the full set lands.
 */
const HERO_COARSE_FRAMES = Array.from(
  { length: 12 },
  (_, i) => `f${String(i * 8 + 1).padStart(3, "0")}.webp`,
);

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale);

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: d.meta.homeTitle,
      template: "%s — TOOLOR",
    },
    description: d.meta.siteDescription,
    alternates: {
      canonical: `/${locale}`,
      languages: localeAlternates("/"),
    },
    openGraph: {
      type: "website",
      locale: localeOpenGraph[locale],
      siteName: siteConfig.name,
      title: d.meta.homeTitle,
      description: d.meta.siteDescription,
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const activeLocale: Locale = locale;
  const d = getDictionary(activeLocale);

  return (
    <html
      lang={localeHtmlLang[activeLocale]}
      data-scroll-behavior="smooth"
      className={`${brandFallback.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          Hero frames are fetched by a client effect, so nothing asked for them
          until hydration finished — measured at 951ms while CSS and JS started
          at 98ms, leaving the connection idle in between. Preloading the coarse
          pass here starts it with everything else; `media` keeps each device to
          its own set.
        */}
        {HERO_COARSE_FRAMES.map((frame) => (
          <link
            as="image"
            href={`/media/hero/frames/mobile/${frame}`}
            key={`m-${frame}`}
            media="(max-width: 1023px)"
            rel="preload"
            type="image/webp"
          />
        ))}
        {HERO_COARSE_FRAMES.map((frame) => (
          <link
            as="image"
            href={`/media/hero/frames/desktop/${frame}`}
            key={`d-${frame}`}
            media="(min-width: 1024px)"
            rel="preload"
            type="image/webp"
          />
        ))}

        {/* Preload the two most-used brand weights to cut first-paint swap. */}
        <link
          rel="preload"
          href="/fonts/tt-commons-pro-400.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/tt-commons-pro-600.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only z-[100] bg-white px-4 py-3 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        >
          {d.header.skipToContent}
        </a>
        <BrandPreloader label={d.header.homeAria} />
        <Header locale={activeLocale} />
        <CartDrawer locale={activeLocale} />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer locale={activeLocale} />
      </body>
    </html>
  );
}
