import { preload } from "react-dom";

import { getDictionary, localePath, type Locale } from "@/i18n";

import { HERO_DESKTOP_QUERY, HERO_TRACK } from "./hero-media";
import { HeroScrollVideo } from "./hero-scroll-video";

export interface HeroSectionContent {
  kicker: string;
  /** Brand wordmark — never translated. */
  title: string;
  description: string;
  primaryCta: { href: string; label: string };
  secondaryCta: { href: string; label: string };
}

export function HeroSection({ locale }: { locale: Locale }) {
  const d = getDictionary(locale);

  // The track is fetched by a client effect, so nothing would ask for it
  // until hydration — measured at ~950ms after the HTML, with the connection
  // idle in between. Preloading from here starts it with the CSS and JS, on
  // the home page only, and `media` keeps each device to its own track and
  // spares visitors who asked for reduced motion (they get the poster).
  for (const [mode, media] of [
    ["mobile", "(width < 1024px)"],
    ["desktop", HERO_DESKTOP_QUERY],
  ] as const) {
    preload(HERO_TRACK[mode].url, {
      as: "fetch",
      crossOrigin: "anonymous",
      media: `${media} and (prefers-reduced-motion: no-preference)`,
    });
  }

  const content: HeroSectionContent = {
    kicker: d.home.hero.kicker,
    title: "Modern nomads",
    description: d.home.hero.description,
    primaryCta: {
      href: localePath(locale, "/catalog"),
      label: d.home.hero.primaryCta,
    },
    secondaryCta: {
      href: localePath(locale, "/about"),
      label: d.home.hero.secondaryCta,
    },
  };

  return (
    <section
      aria-label={d.home.hero.sectionAria}
      className="relative"
      data-scroll-anchor="hero"
    >
      {/* Responsive full-bleed scroll scene. Mobile receives a dedicated
          portrait encode; desktop receives the wide master. */}
      <HeroScrollVideo
        content={content}
        className="-mt-[var(--header-height)]"
      />
    </section>
  );
}
