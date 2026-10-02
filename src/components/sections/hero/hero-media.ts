import heroTracks from "@/data/hero-tracks.json";

/**
 * Where the hero's media lives. Kept out of the client component so the
 * server-rendered section can preload the same files the canvas will fetch.
 */

export type HeroMode = "mobile" | "desktop";

/** Matches the Tailwind `lg` breakpoint the hero layout switches on. */
export const HERO_DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * The original H.264 samples split at keyframes. The manifest travels with
 * the component; only the segments around the scroll target are urgent.
 * Hashed paths let the CDN and browser retain them across repeat visits.
 */
export const HERO_TRACK = heroTracks;

/** WebP stills for browsers without WebCodecs. */
export const HERO_STILLS = {
  count: 96,
  mobile: { width: 1440, height: 2560 },
  desktop: { width: 2880, height: 1620 },
} as const;

export const heroStillUrl = (mode: HeroMode, index: number) =>
  `/media/hero/frames/${mode}/f${String(index + 1).padStart(3, "0")}.webp`;
