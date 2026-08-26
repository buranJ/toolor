"use client";

import Link from "next/link";
import { useRef } from "react";

import { LanguageSwitcher } from "@/components/navigation/language-switcher";
import { BrandLogo } from "@/components/ui/brand-logo";
import { getDictionary, localePath, type Locale } from "@/i18n";
import { navigation } from "@/lib/config/site";

/* One stroke language for all three: 20x20 box, 1.5 stroke, round joins —
   matching the bag icon the header already uses. */
function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M13.2 13.2 17 17"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M10 16.5S3.5 12.6 3.5 8.2A3.7 3.7 0 0 1 10 5.9a3.7 3.7 0 0 1 6.5 2.3c0 4.4-6.5 8.3-6.5 8.3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path
        d="M5.5 7V5.5a4.5 4.5 0 0 1 9 0V7m-11 0h13l1 11h-15l1-11Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function MobileMenu({ locale }: { locale: Locale }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const d = getDictionary(locale);

  return (
    <>
      <button
        aria-label={d.mobileMenu.open}
        className="mobile-menu-trigger"
        onClick={() => dialogRef.current?.showModal()}
        type="button"
      >
        <span>{d.mobileMenu.trigger}</span>
        <span aria-hidden="true" className="mobile-menu-trigger-lines">
          <i />
          <i />
        </span>
      </button>
      <dialog className="menu-dialog" data-testid="mobile-menu" ref={dialogRef}>
        <div className="mobile-menu-panel">
          <header className="flex items-center justify-between">
            <Link
              aria-label={d.header.homeAria}
              href={localePath(locale, "/")}
              onClick={() => dialogRef.current?.close()}
            >
              <BrandLogo tone="blue" className="h-6" />
            </Link>
            <div className="flex items-center gap-3">
              <LanguageSwitcher label={d.language.switch} locale={locale} />
              <button
                aria-label={d.mobileMenu.close}
                className="mobile-menu-close"
                onClick={() => dialogRef.current?.close()}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </header>
          <nav aria-label={d.mobileMenu.navAria} className="my-auto py-10">
            <ul>
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    className="mobile-menu-link group"
                    href={localePath(locale, item.href)}
                    onClick={() => dialogRef.current?.close()}
                  >
                    <span>{d.nav[item.key]}</span>
                    <span aria-hidden="true" className="mobile-menu-link-arrow">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mobile-menu-shortcuts">
            {(
              [
                { href: "/search", label: d.nav.search, icon: <SearchIcon /> },
                {
                  href: "/wishlist",
                  label: d.nav.wishlist,
                  icon: <HeartIcon />,
                },
                { href: "/cart", label: d.nav.cart, icon: <BagIcon /> },
              ] as const
            ).map((item) => (
              <Link
                href={localePath(locale, item.href)}
                key={item.href}
                onClick={() => dialogRef.current?.close()}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}
