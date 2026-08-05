import Image from "next/image";
import Link from "next/link";

import { BrandLogo } from "@/components/ui/brand-logo";
import { Container } from "@/components/ui/container";
import { APP_STORES, StoreIcon } from "@/components/ui/app-store-links";
import { SocialLinks } from "@/components/ui/social-icons";

const links = [
  ["Каталог", "/catalog"],
  ["О бренде", "/about"],
  ["Материалы", "/sustainability"],
  ["Магазины", "/stores"],
  ["Доставка", "/delivery"],
  ["Возврат", "/returns"],
] as const;

function FooterMountainCut() {
  return (
    <svg
      aria-hidden="true"
      className="footer-mountain-cut"
      preserveAspectRatio="none"
      viewBox="0 0 1440 150"
    >
      <path d="M0 0H1440V75C1402 72 1370 69 1339 77C1310 85 1284 87 1257 80L1219 68L1186 73L1138 32L1105 60L1068 68L1027 82C991 91 953 88 914 78L872 66L839 78L803 88C773 94 744 91 716 82L678 43L643 64L606 60L558 29L524 56L485 75L443 65L407 73C379 82 355 87 332 88L297 78L263 65L220 35L190 60L151 70L111 82L72 77L37 84L0 80Z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="site-footer relative overflow-hidden text-white">
      <div aria-hidden="true" className="site-footer-media">
        <Image
          alt=""
          className="site-footer-image"
          fill
          sizes="100vw"
          src="/images/toolor-glacier-footer.webp"
        />
      </div>
      <div aria-hidden="true" className="site-footer-atmosphere" />
      <FooterMountainCut />

      <Container className="site-footer-content relative z-10 pt-28 pb-8 md:pt-36">
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
            <div
              className="footer-app-downloads"
              aria-label="Скачать приложение"
            >
              {APP_STORES.map((store) => (
                <a
                  aria-label={`Скачать TOOLOR в ${store.name}`}
                  className="footer-app-download-link"
                  href={store.href}
                  key={store.name}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  <StoreIcon kind={store.icon} />
                  <span>
                    <small>{store.eyebrow}</small>
                    <strong>{store.name}</strong>
                  </span>
                </a>
              ))}
            </div>
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
