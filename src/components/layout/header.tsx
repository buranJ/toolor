import Link from "next/link";

import { CartLink } from "@/components/cart/cart-link";
import { WishlistLink } from "@/components/layout/wishlist-link";
import { LanguageSwitcher } from "@/components/navigation/language-switcher";
import { MobileMenu } from "@/components/navigation/mobile-menu";
import { BrandLogo } from "@/components/ui/brand-logo";
import { getDictionary, localePath, type Locale } from "@/i18n";
import { navigation } from "@/lib/config/site";

export function Header({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);

  return (
    <header className="site-header sticky top-0 z-[var(--depth-nav)]">
      <div className="header-frame">
        <div className="header-surface">
          <div className="header-layout relative z-10 grid min-h-16 grid-cols-[1fr_auto] items-center gap-5 xl:min-h-[4.5rem] xl:grid-cols-[auto_1fr_auto] xl:gap-8">
            <Link
              aria-label={d.header.homeAria}
              className="header-mark flex w-fit items-center"
              href={localePath(locale, "/")}
            >
              <BrandLogo tone="blue" className="h-5 xl:h-6" />
            </Link>

            <nav
              aria-label={d.header.mainNavAria}
              className="hidden justify-self-center xl:block"
            >
              <ul className="flex items-center gap-[clamp(1.25rem,2.2vw,2.75rem)]">
                {navigation.map((item) => (
                  <li key={item.href}>
                    <Link
                      className="summit-nav-link"
                      href={localePath(locale, item.href)}
                    >
                      {d.nav[item.key]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex items-center gap-1.5 justify-self-end xl:hidden">
              <CartLink compact locale={locale} />
              <MobileMenu locale={locale} />
            </div>

            <nav
              aria-label={d.header.serviceNavAria}
              className="hidden justify-self-end xl:block"
            >
              <ul className="flex items-center gap-5">
                <li>
                  <LanguageSwitcher label={d.language.switch} locale={locale} />
                </li>
                <li>
                  <Link
                    className="summit-service-link"
                    href={localePath(locale, "/search")}
                  >
                    {d.nav.search}
                  </Link>
                </li>
                <li>
                  <WishlistLink locale={locale} />
                </li>
                <li>
                  <CartLink locale={locale} />
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
