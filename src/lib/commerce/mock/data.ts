import generatedProductData from "@/data/toolor-products.generated.json";
import { generatedProductFileSchema } from "@/lib/commerce/importers";
import type { Category, Collection, Product } from "@/types";

const parsed = generatedProductFileSchema.parse(generatedProductData);

export const mockProducts: Product[] = parsed.products.map((product) => ({
  ...product,
  collectionIds: product.featured ? ["collection-import-selection"] : [],
  images: product.images.filter((image) => image.status === "reachable"),
}));

export const mockCategories: Category[] = [
  {
    id: "category-men",
    name: "Мужская одежда",
    slug: "men",
    description: "Мужская коллекция TOOLOR — для города и маршрута.",
  },
  {
    id: "category-women",
    name: "Женская одежда",
    slug: "women",
    description: "Женская коллекция TOOLOR — для города и маршрута.",
  },
  {
    id: "category-accessories",
    name: "Аксессуары",
    slug: "accessories",
    description: "Головные уборы, платки и аксессуары TOOLOR.",
  },
];

export const mockCollections: Collection[] = [
  {
    id: "collection-import-selection",
    name: "Toolor edit / 01",
    slug: "import-selection-01",
    description: "Редакционная выборка ключевых моделей коллекции TOOLOR.",
    productIds: mockProducts
      .filter((product) => product.featured)
      .map((product) => product.id),
  },
];
