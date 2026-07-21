export type CurrencyCode = "KGS" | "USD";

export interface Money {
  amount: number;
  currencyCode: CurrencyCode;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  width?: number;
  height?: number;
  status?: "reachable" | "unreachable" | "unchecked";
  httpStatus?: number | null;
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string;
  availableForSale: boolean;
  options: Record<string, string>;
  price: Money;
  discountAmount?: Money;
  availabilityStatus?: "available" | "unavailable" | "unknown";
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  productIds: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  collectionIds: string[];
  images: ProductImage[];
  variants: ProductVariant[];
  price: Money;
  discountAmount?: Money;
  featured: boolean;
  tags: string[];
  productType?: string;
  gender?: "men" | "women" | "unisex" | "unknown";
  colors?: string[];
  sizes?: string[];
  material?: string;
  care?: string;
  modelInformation?: string;
  collectionName?: string;
  fallbacks?: string[];
  source?: {
    workbook: string;
    sheet: string;
    rows: number[];
    originalSkus: string[];
    productUrl: string | null;
  };
  dataSource: "mock" | "spreadsheet";
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
}

export interface Cart {
  id: string;
  items: CartItem[];
  totalQuantity: number;
  subtotal: Money;
  dataSource: "mock";
}

export interface Address {
  id: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  countryCode: string;
  phone?: string;
}

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  addresses: Address[];
}

export interface Order {
  id: string;
  number: string;
  createdAt: string;
  status: "pending" | "paid" | "fulfilled" | "cancelled";
  items: CartItem[];
  total: Money;
}

export interface WishlistItem {
  id: string;
  productId: string;
  addedAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export type SortOption = "featured" | "newest" | "price-asc" | "price-desc";

export interface ProductFilters {
  category?: string;
  gender?: "men" | "women" | "unisex" | "unknown";
  size?: string;
  color?: string;
  collection?: string;
  search?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
}
