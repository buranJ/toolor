import type { CommerceProvider } from "@/lib/commerce/contracts";
import type {
  Cart,
  CartItem,
  Category,
  Collection,
  Money,
  PaginatedResult,
  Product,
  ProductFilters,
  WishlistItem,
} from "@/types";

import { mockCategories, mockCollections, mockProducts } from "./data";

export interface CatalogData {
  products: Product[];
  categories: Category[];
  collections: Collection[];
  productOrder: string[];
  collectionOrder: string[];
}

const staticCatalog = async (): Promise<CatalogData> => ({
  products: mockProducts,
  categories: mockCategories,
  collections: mockCollections,
  productOrder: [],
  collectionOrder: [],
});

function orderRank(ids: string[]) {
  return new Map(ids.map((id, index) => [id, index]));
}

const emptyMoney = (): Money => ({ amount: 0, currencyCode: "KGS" });

function paginate<T>(items: T[], page = 1, pageSize = 12): PaginatedResult<T> {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / safePageSize));
  const safePage = Math.min(totalPages, Math.max(1, page));
  const start = (safePage - 1) * safePageSize;

  return {
    items: items.slice(start, start + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    totalItems: items.length,
    totalPages,
  };
}

function sortProducts(products: Product[], sort = "featured", order: string[] = []): Product[] {
  const copy = [...products];

  if (sort === "price-asc" || sort === "price-desc")
    return copy.sort(
      (a, b) =>
        Number(a.priceStatus === "unknown") -
          Number(b.priceStatus === "unknown") ||
        (sort === "price-asc"
          ? a.price.amount - b.price.amount
          : b.price.amount - a.price.amount),
    );
  if (sort === "newest") return copy.reverse();
  const rank = orderRank(order);
  return copy.sort((a, b) =>
    (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
    Number(b.featured) - Number(a.featured),
  );
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
  constructor(private readonly loadCatalog: () => Promise<CatalogData> = staticCatalog) {}
  private readonly carts = new Map<string, Cart>();
  private wishlist: WishlistItem[] = [];

  async getProducts(
    filters: ProductFilters = {},
  ): Promise<PaginatedResult<Product>> {
    const catalog = await this.loadCatalog();
    let products = [...catalog.products];

    if (filters.category) {
      const category = catalog.categories.find(
        (item) => item.slug === filters.category,
      );
      products = category
        ? products.filter((item) => item.categoryId === category.id)
        : [];
    }

    if (filters.collection) {
      const collection = catalog.collections.find(
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
      products = products.filter(
        (item) =>
          item.priceStatus !== "unknown" && item.price.amount >= minPrice,
      );
    }

    if (filters.maxPrice !== undefined) {
      const maxPrice = filters.maxPrice;
      products = products.filter(
        (item) =>
          item.priceStatus !== "unknown" && item.price.amount <= maxPrice,
      );
    }

    return paginate(
      sortProducts(products, filters.sort, catalog.productOrder),
      filters.page,
      filters.pageSize,
    );
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    return (await this.loadCatalog()).products.find((item) => item.slug === slug) ?? null;
  }

  async getCategories() {
    // Categories are stable storefront taxonomy, independent of the uploaded workbook.
    return [...mockCategories];
  }

  async getCollections() {
    const catalog = await this.loadCatalog();
    const rank = orderRank(catalog.collectionOrder);
    return [...catalog.collections].sort((a, b) =>
      (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  async searchProducts(query: string, filters: ProductFilters = {}) {
    return this.getProducts({ ...filters, search: query });
  }

  async getFeaturedProducts(limit = 4) {
    const catalog = await this.loadCatalog();
    return sortProducts(catalog.products.filter((item) => item.featured), "featured", catalog.productOrder).slice(0, limit);
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
    const product = (await this.loadCatalog()).products.find((item) =>
      item.variants.some((variant) => variant.id === variantId),
    );
    const variant = product?.variants.find((item) => item.id === variantId);
    if (!product || !variant) throw new Error("Mock variant not found");
    if (variant.priceStatus === "unknown")
      throw new Error("Price requires confirmation");

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
    if (!(await this.loadCatalog()).products.some((item) => item.id === productId)) {
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
