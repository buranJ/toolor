import Link from "next/link";

import { CartLink } from "@/components/cart/cart-link";
import { MobileMenu } from "@/components/navigation/mobile-menu";
import { siteConfig } from "@/lib/config/site";

function SnowEdge() {
  return (
    <svg
      aria-hidden="true"
      className="snow-header-edge"
      preserveAspectRatio="none"
      viewBox="0 0 1440 64"
    >
      <path d="M0 0H1440V18L1368 38L1308 13L1237 49L1165 22L1088 42L1018 10L932 47L848 25L768 55L678 17L594 43L506 20L420 51L336 12L252 46L174 22L92 52L0 25Z" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="site-header sticky top-0 z-[var(--depth-nav)]">
      <div className="header-frame">
        <div className="snow-header-surface">
          <SnowEdge />
          <div className="header-layout relative z-10 grid min-h-16 grid-cols-[1fr_auto] items-center gap-5 xl:min-h-[4.5rem] xl:grid-cols-[auto_1fr_auto] xl:gap-8">
            <Link
              aria-label="TOOLOR, на главную"
              className="header-mark flex w-fit items-baseline gap-2"
              href="/"
            >
              <span className="text-[1.55rem] font-bold tracking-[-0.085em] xl:text-[1.7rem]">
                TOOLOR<span className="text-brand">/</span>
              </span>
              <span className="text-ink/45 font-mono text-[0.5rem] tracking-[0.18em] uppercase">
                KG
              </span>
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
                  <Link
                    aria-label="Избранное"
                    className="summit-icon-link"
                    href="/wishlist"
                  >
                    ♡
                  </Link>
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
