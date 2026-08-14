import type { Dictionary } from "@/i18n";
import type { Category, Collection } from "@/types";

/**
 * Category and collection records come from the commerce provider, which stays
 * backend-neutral and language-agnostic. Their display names are storefront
 * taxonomy rather than product data, so they are translated here — at the
 * presentation boundary — keyed by slug. An unknown slug keeps whatever the
 * provider supplied.
 */
const CATEGORY_KEYS = {
  men: "men",
  women: "women",
  accessories: "accessories",
} as const satisfies Record<string, keyof Dictionary["categories"]>;

const COLLECTION_KEYS = {
  "import-selection-01": "importSelection01",
} as const satisfies Record<string, keyof Dictionary["collections"]>;

export function localizeCategory(category: Category, d: Dictionary): Category {
  const key = CATEGORY_KEYS[category.slug as keyof typeof CATEGORY_KEYS];
  if (!key) return category;

  return {
    ...category,
    name: d.categories[key].name,
    description: d.categories[key].description,
  };
}

export function localizeCategories(
  categories: Category[],
  d: Dictionary,
): Category[] {
  return categories.map((category) => localizeCategory(category, d));
}

export function localizeCollection(
  collection: Collection,
  d: Dictionary,
): Collection {
  const key = COLLECTION_KEYS[collection.slug as keyof typeof COLLECTION_KEYS];
  if (!key) return collection;

  // Collection names like "Toolor edit / 01" are brand marks and stay as-is;
  // only the description is translated.
  return { ...collection, description: d.collections[key].description };
}

export function localizeCollections(
  collections: Collection[],
  d: Dictionary,
): Collection[] {
  return collections.map((collection) => localizeCollection(collection, d));
}
