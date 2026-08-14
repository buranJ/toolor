import type { Metadata } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import { notFound } from "next/navigation";

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
