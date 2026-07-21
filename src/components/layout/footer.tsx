import Link from "next/link";

import { Container } from "@/components/ui/container";
import { MountainEdge } from "@/components/ui/mountain-edge";

const links = [
  ["Каталог", "/catalog"],
  ["О бренде", "/about"],
  ["Сообщество", "/community"],
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
      <MountainEdge position="top" className="text-paper" />
      <FooterRidges />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/45" />

      <Container className="relative z-10 pt-24 pb-8 md:pt-28">
        <div className="grid gap-14 lg:grid-cols-[1.5fr_0.7fr_0.9fr]">
          <div>
            <p className="mono-meta text-white/55">TOOLOR Dispatch</p>
            <h2 className="mt-6 max-w-xl font-serif text-3xl leading-tight font-medium md:text-5xl">
              Новые маршруты, коллекции и{" "}
              <span className="serif-italic">истории.</span>
            </h2>
            <div
              className="mt-8 flex max-w-md items-center rounded-full border border-white/25 bg-white/5 pr-2 pl-5 backdrop-blur-sm"
              aria-describedby="newsletter-note"
            >
              <span className="flex min-h-13 flex-1 items-center text-sm text-white/40">
                EMAIL
              </span>
              <button
                className="rounded-full bg-white/15 px-5 py-2.5 text-xs font-medium tracking-[0.04em] text-white/55"
                disabled
                type="button"
              >
                Скоро
              </button>
            </div>
            <p className="mt-3 text-xs text-white/40" id="newsletter-note">
              Подписка будет подключена после согласования политики данных.
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
            <p className="mt-6 max-w-xs text-sm leading-6 text-white/70">
              Контакты и социальные ссылки появятся после подтверждения
              владельцем бренда.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-white/45">
              <span className="mono-meta">Instagram / pending</span>
              <span className="mono-meta">TikTok / pending</span>
            </div>
            <p className="mono-meta mt-6 text-white/35">42.87° N / 74.57° E</p>
          </div>
        </div>

        <p className="mt-16 text-[clamp(4.5rem,17vw,17rem)] leading-[0.7] font-bold tracking-[-0.06em] text-white/95 md:mt-24">
          TOOLOR
        </p>
        <div className="mt-8 flex flex-col gap-2 border-t border-white/15 pt-5 text-xs text-white/45 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} TOOLOR — Kyrgyzstan</p>
          <p>Commerce prototype / Data from provided workbook</p>
        </div>
      </Container>
    </footer>
  );
}
