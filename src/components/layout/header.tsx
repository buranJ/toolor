import Link from "next/link";

import { CartLink } from "@/components/cart/cart-link";
import { WishlistLink } from "@/components/layout/wishlist-link";
import { MobileMenu } from "@/components/navigation/mobile-menu";
import { BrandLogo } from "@/components/ui/brand-logo";
import { siteConfig } from "@/lib/config/site";

export function Header() {
  return (
    <header className="site-header sticky top-0 z-[var(--depth-nav)]">
      <div className="header-frame">
        <div className="header-surface">
          <div className="header-layout relative z-10 grid min-h-16 grid-cols-[1fr_auto] items-center gap-5 xl:min-h-[4.5rem] xl:grid-cols-[auto_1fr_auto] xl:gap-8">
            <Link
              aria-label="TOOLOR, на главную"
              className="header-mark flex w-fit items-center"
              href="/"
            >
              <BrandLogo tone="blue" className="h-5 xl:h-6" />
            </Link>

            <nav
              aria-label="Основная навигация"
              className="hidden justify-self-center xl:block"
            >
              <ul className="flex items-center gap-[clamp(1.25rem,2.2vw,2.75rem)]">
                {siteConfig.navigation.map((item) => (
                  <li key={item.href}>
                    <Link className="summit-nav-link" href={item.href}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex items-center gap-1.5 justify-self-end xl:hidden">
              <CartLink compact />
              <MobileMenu />
            </div>

            <nav
              aria-label="Сервисная навигация"
              className="hidden justify-self-end xl:block"
            >
              <ul className="flex items-center gap-5">
                <li>
                  <Link className="summit-service-link" href="/search">
                    Поиск
                  </Link>
                </li>
                <li>
                  <WishlistLink />
                </li>
                <li>
                  <CartLink />
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
