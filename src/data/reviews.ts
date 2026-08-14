import type { Dictionary } from "@/i18n";

export type Review = {
  name: string;
  city: string;
  initials: string;
  rating: 5;
  quote: string;
  context: string;
};

/**
 * Homepage testimonials. Placeholder copy for launch — replace with real
 * customer reviews (and their consent) before going live.
 *
 * Every field lives in the dictionaries, so each locale carries its own
 * transliterated name, city and quote.
 */
export const reviewKeys = [
  "azamat",
  "aruuzat",
  "daniyar",
  "nuray",
  "emir",
  "aygerim",
] as const satisfies ReadonlyArray<keyof Dictionary["reviews"]>;

export function getReviews(dictionary: Dictionary): Review[] {
  return reviewKeys.map((key) => ({
    ...dictionary.reviews[key],
    rating: 5,
  }));
}
