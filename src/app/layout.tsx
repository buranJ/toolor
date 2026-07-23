import type { Metadata } from "next";
import { Geist_Mono, Manrope } from "next/font/google";

import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { siteConfig } from "@/lib/config/site";

import "./globals.css";

// Brand typeface is TT Commons Pro (see globals.css @font-face / --font-brand).
// Manrope is the loaded fallback grotesk — closest geometric match with Cyrillic
// support — used until TT Commons Pro web files are dropped into /public/fonts.
const brandFallback = Manrope({
  variable: "--font-brand-fallback",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "TOOLOR — одежда для современных кочевников",
    template: "%s — TOOLOR",
  },
  description: siteConfig.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: "TOOLOR — одежда для современных кочевников",
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      data-scroll-behavior="smooth"
      className={`${brandFallback.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only z-[100] bg-white px-4 py-3 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        >
          Перейти к содержанию
        </a>
        <Header />
        <CartDrawer />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
