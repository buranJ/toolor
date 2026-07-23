export const siteConfig = {
  name: "TOOLOR",
  description:
    "Современный бренд одежды из Кыргызстана для тех, кто в движении между городом и горами.",
  url: "https://toolorkg.com",
  locale: "ru_KG",
  navigation: [
    { href: "/catalog", label: "Каталог" },
    { href: "/catalog/men", label: "Мужчинам" },
    { href: "/catalog/women", label: "Женщинам" },
    { href: "/catalog/accessories", label: "Аксессуары" },
    { href: "/about", label: "О бренде" },
  ],
} as const;
