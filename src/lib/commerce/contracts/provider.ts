import type {
  Cart,
  Category,
  Collection,
  PaginatedResult,
  Product,
  ProductFilters,
  WishlistItem,
} from "@/types";

export interface CommerceProvider {
  getProducts(filters?: ProductFilters): Promise<PaginatedResult<Product>>;
  getProductBySlug(slug: string): Promise<Product | null>;
  getCategories(): Promise<Category[]>;
  getCollections(): Promise<Collection[]>;
  searchProducts(
    query: string,
    filters?: ProductFilters,
  ): Promise<PaginatedResult<Product>>;
  getFeaturedProducts(limit?: number): Promise<Product[]>;
  createCart(): Promise<Cart>;
  getCart(cartId: string): Promise<Cart | null>;
  addCartItem(
    cartId: string,
    variantId: string,
    quantity: number,
  ): Promise<Cart>;
  updateCartItem(
    cartId: string,
    itemId: string,
    quantity: number,
  ): Promise<Cart>;
  removeCartItem(cartId: string, itemId: string): Promise<Cart>;
  getWishlist(): Promise<WishlistItem[]>;
  addWishlistItem(productId: string): Promise<WishlistItem[]>;
  removeWishlistItem(productId: string): Promise<WishlistItem[]>;
}
