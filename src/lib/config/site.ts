export const siteConfig = {
  name: "TOOLOR",
  description:
    "Современный бренд одежды из Кыргызстана. Демо-версия нового цифрового пространства.",
  url: "https://toolorkg.com",
  locale: "ru_KG",
  navigation: [
    { href: "/catalog/men", label: "Мужчинам" },
    { href: "/catalog/women", label: "Женщинам" },
    { href: "/catalog/accessories", label: "Аксессуары" },
    { href: "/community", label: "Сообщество" },
    { href: "/about", label: "О бренде" },
  ],
} as const;
