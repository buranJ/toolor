import type { CommerceProvider } from "./contracts";
import { MockCommerceProvider } from "./mock";
import { loadPublishedCatalog } from "./catalog-data";

export type { CommerceProvider } from "./contracts";
export {
  localizeCategories,
  localizeCategory,
  localizeCollection,
  localizeCollections,
} from "./localize";

// Backend seam: replace this construction with a WooCommerce/custom API adapter.
export const commerce: CommerceProvider = new MockCommerceProvider(loadPublishedCatalog);
