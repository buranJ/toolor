/**
 * Where the hero's media lives. Kept out of the client component so the
 * server-rendered section can preload the same files the canvas will fetch.
 */

export type HeroMode = "mobile" | "desktop";

/** Matches the Tailwind `lg` breakpoint the hero layout switches on. */
export const HERO_DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * The clip as H.264 for WebCodecs — every source frame, 4.6MB on phones and
 * 5.3MB on desktops (see scripts/build-hero-video.ts). Mobile is cut from
 * the portrait master, desktop from the landscape one.
 */
export const HERO_TRACK = {
  mobile: { url: "/media/hero/hero-mobile.bin", width: 1080, height: 1920 },
  desktop: { url: "/media/hero/hero-desktop.bin", width: 2560, height: 1440 },
} as const;

/** WebP stills for browsers without WebCodecs. */
export const HERO_STILLS = {
  count: 96,
  mobile: { width: 1440, height: 2560 },
  desktop: { width: 2880, height: 1620 },
} as const;

export const heroStillUrl = (mode: HeroMode, index: number) =>
  `/media/hero/frames/${mode}/f${String(index + 1).padStart(3, "0")}.webp`;
