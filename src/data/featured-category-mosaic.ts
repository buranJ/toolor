import type { Dictionary } from "@/i18n";

/**
 * Homepage category mosaic.
 *
 * `productType` and the `q` search value must keep matching the imported
 * workbook data, which is Russian — they are data selectors, not copy. Only
 * `labelKey` resolves to translated text shown to the visitor.
 */
export const featuredCategoryMosaicItems = [
  {
    labelKey: "hats",
    productType: "Головные уборы",
    href: "/catalog?q=Головные+уборы",
    column: 1,
    size: "compact",
    imageOffset: 0,
  },
  {
    labelKey: "sets",
    productType: "Комплекты",
    href: "/catalog?q=Комплекты",
    column: 1,
    size: "tall",
    imageOffset: 0,
  },
  {
    labelKey: "jackets",
    productType: "Куртки и пуховики",
    href: "/catalog?q=Куртки+и+пуховики",
    column: 2,
    size: "tall",
    imageOffset: 0,
  },
  {
    labelKey: "scarves",
    productType: "Шарфы и платки",
    href: "/catalog?q=Шарфы+и+платки",
    column: 2,
    size: "compact",
    imageOffset: 1,
  },
  {
    labelKey: "tshirts",
    productType: "Футболки",
    href: "/catalog?q=Футболки",
    column: 3,
    size: "compact",
    imageOffset: 0,
  },
  {
    labelKey: "trousers",
    productType: "Брюки",
    href: "/catalog?q=Брюки",
    column: 3,
    size: "tall",
    imageOffset: 0,
  },
] as const satisfies ReadonlyArray<{
  labelKey: keyof Dictionary["home"]["categoryMosaic"]["items"];
  productType: string;
  href: string;
  column: 1 | 2 | 3;
  size: "compact" | "tall";
  imageOffset: number;
}>;
