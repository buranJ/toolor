import type { CommerceProvider } from "@/lib/commerce/contracts";
import type {
  Cart,
  CartItem,
  Money,
  PaginatedResult,
  Product,
  ProductFilters,
  WishlistItem,
} from "@/types";

import { mockCategories, mockCollections, mockProducts } from "./data";

const emptyMoney = (): Money => ({ amount: 0, currencyCode: "KGS" });

function paginate<T>(items: T[], page = 1, pageSize = 12): PaginatedResult<T> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safePageSize;

  return {
    items: items.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    totalItems: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / safePageSize)),
  };
}

function sortProducts(products: Product[], sort = "featured"): Product[] {
  const copy = [...products];

  if (sort === "price-asc")
    return copy.sort((a, b) => a.price.amount - b.price.amount);
  if (sort === "price-desc")
    return copy.sort((a, b) => b.price.amount - a.price.amount);
  if (sort === "newest") return copy.reverse();
  return copy.sort((a, b) => Number(b.featured) - Number(a.featured));
}

function cartTotals(
  items: CartItem[],
): Pick<Cart, "totalQuantity" | "subtotal"> {
  return {
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: {
      amount: items.reduce((sum, item) => sum + item.lineTotal.amount, 0),
      currencyCode: "KGS",
    },
  };
}

export class MockCommerceProvider implements CommerceProvider {
  private readonly carts = new Map<string, Cart>();
  private wishlist: WishlistItem[] = [];

  async getProducts(
    filters: ProductFilters = {},
  ): Promise<PaginatedResult<Product>> {
    let products = [...mockProducts];

    if (filters.category) {
      const category = mockCategories.find(
        (item) => item.slug === filters.category,
      );
      products = category
        ? products.filter((item) => item.categoryId === category.id)
        : [];
    }

    if (filters.collection) {
      const collection = mockCollections.find(
        (item) => item.slug === filters.collection,
      );
      products = collection
        ? products.filter((item) => collection.productIds.includes(item.id))
        : [];
    }

    if (filters.gender) {
      products = products.filter((item) => item.gender === filters.gender);
    }

    if (filters.size) {
      const size = filters.size;
      products = products.filter((item) => item.sizes?.includes(size));
    }

    if (filters.color) {
      const color = filters.color;
      products = products.filter((item) => item.colors?.includes(color));
    }

    if (filters.search) {
      const query = filters.search.toLocaleLowerCase();
      products = products.filter((item) =>
        `${item.name} ${item.description} ${item.productType ?? ""}`
          .toLocaleLowerCase()
          .includes(query),
      );
    }

    if (filters.tags?.length) {
      products = products.filter((item) =>
        filters.tags?.every((tag) => item.tags.includes(tag)),
      );
    }

    if (filters.minPrice !== undefined) {
      const minPrice = filters.minPrice;
      products = products.filter((item) => item.price.amount >= minPrice);
    }

    if (filters.maxPrice !== undefined) {
      const maxPrice = filters.maxPrice;
      products = products.filter((item) => item.price.amount <= maxPrice);
    }

    return paginate(
      sortProducts(products, filters.sort),
      filters.page,
      filters.pageSize,
    );
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    return mockProducts.find((item) => item.slug === slug) ?? null;
  }

  async getCategories() {
    return [...mockCategories];
  }

  async getCollections() {
    return [...mockCollections];
  }

  async searchProducts(query: string, filters: ProductFilters = {}) {
    return this.getProducts({ ...filters, search: query });
  }

  async getFeaturedProducts(limit = 4) {
    return mockProducts.filter((item) => item.featured).slice(0, limit);
  }

  async createCart(): Promise<Cart> {
    const id = `mock-cart-${this.carts.size + 1}`;
    const cart: Cart = {
      id,
      items: [],
      totalQuantity: 0,
      subtotal: emptyMoney(),
      dataSource: "mock",
    };
    this.carts.set(id, cart);
    return structuredClone(cart);
  }

  async getCart(cartId: string) {
    const cart = this.carts.get(cartId);
    return cart ? structuredClone(cart) : null;
  }

  async addCartItem(cartId: string, variantId: string, quantity: number) {
    const cart = this.requireCart(cartId);
    const product = mockProducts.find((item) =>
      item.variants.some((variant) => variant.id === variantId),
    );
    const variant = product?.variants.find((item) => item.id === variantId);
    if (!product || !variant) throw new Error("Mock variant not found");

    const existing = cart.items.find((item) => item.variantId === variantId);
    if (existing) {
      existing.quantity += quantity;
      existing.lineTotal.amount = existing.quantity * existing.unitPrice.amount;
    } else {
      cart.items.push({
        id: `mock-item-${cart.items.length + 1}`,
        productId: product.id,
        variantId,
        title: `${product.name} — ${variant.title}`,
        quantity,
        unitPrice: { ...variant.price },
        lineTotal: {
          ...variant.price,
          amount: variant.price.amount * quantity,
        },
      });
    }
    Object.assign(cart, cartTotals(cart.items));
    return structuredClone(cart);
  }

  async updateCartItem(cartId: string, itemId: string, quantity: number) {
    const cart = this.requireCart(cartId);
    const item = cart.items.find((entry) => entry.id === itemId);
    if (!item) throw new Error("Mock cart item not found");
    if (quantity <= 0) return this.removeCartItem(cartId, itemId);
    item.quantity = quantity;
    item.lineTotal.amount = item.unitPrice.amount * quantity;
    Object.assign(cart, cartTotals(cart.items));
    return structuredClone(cart);
  }

  async removeCartItem(cartId: string, itemId: string) {
    const cart = this.requireCart(cartId);
    cart.items = cart.items.filter((item) => item.id !== itemId);
    Object.assign(cart, cartTotals(cart.items));
    return structuredClone(cart);
  }

  async getWishlist() {
    return structuredClone(this.wishlist);
  }

  async addWishlistItem(productId: string) {
    if (!mockProducts.some((item) => item.id === productId)) {
      throw new Error("Mock product not found");
    }
    if (!this.wishlist.some((item) => item.productId === productId)) {
      this.wishlist.push({
        id: `mock-wishlist-${this.wishlist.length + 1}`,
        productId,
        addedAt: new Date(0).toISOString(),
      });
    }
    return structuredClone(this.wishlist);
  }

  async removeWishlistItem(productId: string) {
    this.wishlist = this.wishlist.filter(
      (item) => item.productId !== productId,
    );
    return structuredClone(this.wishlist);
  }

  private requireCart(cartId: string): Cart {
    const cart = this.carts.get(cartId);
    if (!cart) throw new Error("Mock cart not found");
    return cart;
  }
}
