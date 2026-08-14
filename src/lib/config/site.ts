import type { Dictionary } from "@/i18n";

export const siteConfig = {
  name: "TOOLOR",
  url: "https://toolorkg.com",
} as const;

/**
 * Main navigation. Labels are resolved per request from the active dictionary,
 * so a translator only edits `src/i18n/messages/*.json` — never this file.
 */
export const navigation = [
  { href: "/catalog", key: "catalog" },
  { href: "/catalog/men", key: "men" },
  { href: "/catalog/women", key: "women" },
  { href: "/catalog/accessories", key: "accessories" },
  { href: "/about", key: "about" },
] as const satisfies ReadonlyArray<{
  href: string;
  key: keyof Dictionary["nav"];
}>;

/** Footer link list — same key-based contract as `navigation`. */
export const footerNavigation = [
  { href: "/catalog", key: "catalog" },
  { href: "/about", key: "about" },
  { href: "/sustainability", key: "materials" },
  { href: "/stores", key: "stores" },
  { href: "/delivery", key: "delivery" },
  { href: "/returns", key: "returns" },
] as const satisfies ReadonlyArray<{
  href: string;
  key: keyof Dictionary["nav"];
}>;
