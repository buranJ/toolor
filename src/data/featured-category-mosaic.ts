export const featuredCategoryMosaicContent = {
  kicker: "Shop by category / 02",
  title: "Featured categories",
  description:
    "Категории из предоставленного каталога TOOLOR — выбирайте направление и переходите к товарам.",
} as const;

export const featuredCategoryMosaicItems = [
  {
    label: "Головные уборы",
    productType: "Головные уборы",
    href: "/catalog?q=Головные+уборы",
    column: 1,
    size: "compact",
    imageOffset: 0,
  },
  {
    label: "Комплекты",
    productType: "Комплекты",
    href: "/catalog?q=Комплекты",
    column: 1,
    size: "tall",
    imageOffset: 0,
  },
  {
    label: "Куртки",
    productType: "Куртки и пуховики",
    href: "/catalog?q=Куртки+и+пуховики",
    column: 2,
    size: "tall",
    imageOffset: 0,
  },
  {
    label: "Платки",
    productType: "Шарфы и платки",
    href: "/catalog?q=Шарфы+и+платки",
    column: 2,
    size: "compact",
    imageOffset: 1,
  },
  {
    label: "Футболки",
    productType: "Футболки",
    href: "/catalog?q=Футболки",
    column: 3,
    size: "compact",
    imageOffset: 0,
  },
  {
    label: "Брюки",
    productType: "Брюки",
    href: "/catalog?q=Брюки",
    column: 3,
    size: "tall",
    imageOffset: 0,
  },
] as const;
