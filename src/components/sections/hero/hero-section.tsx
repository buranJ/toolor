import { getDictionary, localePath, type Locale } from "@/i18n";

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

  // The track is deliberately not preloaded. A 4.7MB `<link rel=preload>`
  // at high priority was sent ahead of the page's own JavaScript: on
  // toolor.store the last chunk landed at 5.5s, so the hero could not start
  // until the whole track had downloaded — and Safari, which never matched
  // the preload to the fetch, downloaded it twice. The poster (frame 0)
  // covers the gap; the canvas starts streaming the track right after
  // hydration and plays as it arrives.

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
