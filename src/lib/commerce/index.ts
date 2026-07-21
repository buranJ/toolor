import type { CommerceProvider } from "./contracts";
import { MockCommerceProvider } from "./mock";

export type { CommerceProvider } from "./contracts";

// Backend seam: replace this construction with a WooCommerce/custom API adapter.
export const commerce: CommerceProvider = new MockCommerceProvider();
