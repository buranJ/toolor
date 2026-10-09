import type { CommerceProvider } from "@/lib/commerce";
import type { CheckoutRequest } from "./schema";
import { requestNumber } from "./schema";

export class CartChangedError extends Error {}

export type RequestLine = {
  productId: string;
  slug: string;
  variantId: string;
  name: string;
  variant: string;
  sku: string;
  options: Record<string, string>;
  quantity: number;
  unitAmount: number;
};

export type OrderRequest = Omit<CheckoutRequest, "items" | "website"> & {
  number: string;
  createdAt: string;
  items: RequestLine[];
  subtotal: number;
};

/** Never accept names, variant details, availability or prices from storage. */
export async function resolveOrderRequest(
  input: CheckoutRequest,
  provider: CommerceProvider,
): Promise<OrderRequest> {
  const items = await Promise.all(
    input.items.map(async (line) => {
      const product = await provider.getProductBySlug(line.slug);
      const variant = product?.variants.find(
        (item) => item.id === line.variantId,
      );
      if (
        !product ||
        product.id !== line.productId ||
        !variant ||
        variant.availabilityStatus === "unavailable" ||
        variant.price.currencyCode !== "KGS" ||
        variant.price.amount !== line.expectedUnitAmount
      ) {
        throw new CartChangedError();
      }
      return {
        productId: product.id,
        slug: product.slug,
        variantId: variant.id,
        name: product.name,
        variant: variant.title,
        sku: variant.sku,
        options: variant.options,
        quantity: line.quantity,
        unitAmount: variant.price.amount,
      };
    }),
  );
  return {
    requestId: input.requestId,
    number: requestNumber(input.requestId),
    createdAt: new Date().toISOString(),
    locale: input.locale,
    customer: input.customer,
    delivery: input.delivery,
    consent: input.consent,
    items,
    subtotal: items.reduce(
      (sum, item) => sum + item.unitAmount * item.quantity,
      0,
    ),
  };
}
