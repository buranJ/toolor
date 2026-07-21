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
    description: "Мужские товары, импортированные из workbook TOOLOR.",
  },
  {
    id: "category-women",
    name: "Женская одежда",
    slug: "women",
    description: "Женские товары, импортированные из workbook TOOLOR.",
  },
  {
    id: "category-accessories",
    name: "Аксессуары",
    slug: "accessories",
    description: "Головные уборы и платки из workbook TOOLOR.",
  },
];

export const mockCollections: Collection[] = [
  {
    id: "collection-import-selection",
    name: "Import selection / 01",
    slug: "import-selection-01",
    description:
      "Редакционная выборка наиболее полных записей из исходного workbook.",
    productIds: mockProducts
      .filter((product) => product.featured)
      .map((product) => product.id),
  },
];
