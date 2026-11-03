import { createHash } from "node:crypto";
import { cache } from "react";

import { getActiveCatalog, getPriorities } from "@/features/admin/catalog-store";
import type { Product, Collection } from "@/types";

import { mockCategories, mockCollections, mockProducts } from "./mock/data";
import type { CatalogData } from "./mock/provider";

function collectionId(name: string) {
  return `collection-${createHash("sha256").update(name).digest("hex").slice(0, 12)}`;
}

export const loadPublishedCatalog = cache(async (): Promise<CatalogData> => {
  const [active, priorities] = await Promise.all([
    getActiveCatalog(),
    getPriorities(),
  ]);
  const sourceProducts = active?.catalog.products ?? mockProducts;
  const sourceIds = new Set(sourceProducts.map((product) => product.id));
  const productOrder =
    priorities.productIds.length === sourceProducts.length &&
    priorities.productIds.every((id) => sourceIds.has(id)) &&
    sourceIds.size === priorities.productIds.length
      ? priorities.productIds
      : [];
  const products: Product[] = sourceProducts.map(
    (product) => ({
      ...product,
      featured: productOrder.length
        ? productOrder.slice(0, 6).includes(product.id)
        : product.featured,
      collectionIds: product.collectionName
        ? [collectionId(product.collectionName)]
        : [],
      images: product.images.filter((image) => image.status === "reachable"),
    }),
  );
  const names = [...new Set(products.map((product) => product.collectionName).filter((name): name is string => Boolean(name)))];
  const editorial = mockCollections[0];
  if (!editorial) throw new Error("Default collection missing");
  const collections: Collection[] = [
    {
      ...editorial,
      productIds: products.filter((product) => product.featured).map((product) => product.id),
    },
    ...names.map((name) => ({
      id: collectionId(name),
      slug: collectionId(name),
      name,
      productIds: products.filter((product) => product.collectionName === name).map((product) => product.id),
    })),
  ];
  const collectionIds = new Set(collections.map((collection) => collection.id));
  const collectionOrder =
    priorities.collectionIds.length === collections.length &&
    priorities.collectionIds.every((id) => collectionIds.has(id)) &&
    collectionIds.size === priorities.collectionIds.length
      ? priorities.collectionIds
      : [];

  return {
    products,
    categories: mockCategories,
    collections,
    productOrder,
    collectionOrder,
  };
});
