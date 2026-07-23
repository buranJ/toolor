import Link from "next/link";

import { Container } from "@/components/ui/container";
import { BrandLogo } from "@/components/ui/brand-logo";
import { MountainEdge } from "@/components/ui/mountain-edge";
import { SocialLinks } from "@/components/ui/social-icons";

const links = [
  ["Каталог", "/catalog"],
  ["О бренде", "/about"],
  ["Материалы", "/sustainability"],
  ["Магазины", "/stores"],
  ["Доставка", "/delivery"],
  ["Возврат", "/returns"],
] as const;

/** Layered cold mountain ridges (ref. 5) used as a quiet footer backdrop. */
function FooterRidges() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] overflow-hidden"
    >
      <svg
        className="absolute right-0 bottom-0 left-0 h-full w-full"
        viewBox="0 0 1440 400"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
      >
        <path
          d="M0 400 V250 L210 150 L360 220 L560 120 L760 210 L960 110 L1180 200 L1440 130 V400 Z"
          fill="#ffffff"
          opacity="0.04"
        />
        <path
          d="M0 400 V300 L260 210 L470 280 L690 190 L900 270 L1140 180 L1440 250 V400 Z"
          fill="#ffffff"
          opacity="0.06"
        />
      </svg>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-frost-deep relative overflow-hidden text-white">
      <MountainEdge position="top" className="footer-mountain-edge" />
      <FooterRidges />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/45" />

      <Container className="relative z-10 pt-24 pb-8 md:pt-28">
        <div className="grid gap-14 lg:grid-cols-[1.5fr_0.7fr_0.9fr]">
          <div>
            <p className="mono-meta text-white/55">Рассылка</p>
            <h2 className="mt-6 max-w-xl text-3xl leading-tight font-semibold tracking-[-0.03em] md:text-5xl">
              Новые коллекции и истории — первыми.
            </h2>
            <form
              className="mt-8 flex max-w-md items-center rounded-full border border-white/25 bg-white/5 py-1.5 pr-1.5 pl-5 backdrop-blur-sm"
              aria-describedby="newsletter-note"
            >
              <input
                type="email"
                name="email"
                placeholder="Ваш email"
                aria-label="Электронная почта"
                className="min-h-11 flex-1 bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none"
              />
              <button
                className="bg-brand hover:bg-brand-2 rounded-full px-5 py-2.5 text-xs font-semibold tracking-[0.04em] text-white transition-colors"
                type="submit"
              >
                Подписаться
              </button>
            </form>
            <p className="mt-3 text-xs text-white/50" id="newsletter-note">
              Одно письмо в месяц. Без спама.
            </p>
          </div>

          <nav aria-label="Навигация в подвале">
            <p className="mono-meta text-white/55">Навигация</p>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 text-sm lg:grid-cols-1">
              {links.map(([label, href]) => (
                <li key={href}>
                  <Link className="text-white/80 hover:text-white" href={href}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="mono-meta text-white/55">Связь</p>
            <ul className="mt-6 space-y-2 text-sm text-white/75">
              <li>Бишкек, Кыргызстан</li>
              <li>
                <a className="hover:text-white" href="mailto:info@toolorkg.com">
                  info@toolorkg.com
                </a>
              </li>
            </ul>
            <SocialLinks className="mt-8" />
          </div>
        </div>

        <BrandLogo
          tone="white"
          className="mt-16 w-full md:mt-24"
          title="TOOLOR"
        />
        <div className="mt-8 flex flex-col gap-2 border-t border-white/15 pt-5 text-xs text-white/45 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} TOOLOR. Все права защищены.</p>
          <p>Сделано в Кыргызстане</p>
        </div>
      </Container>
    </footer>
  );
}
