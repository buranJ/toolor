import { z } from "zod";

export const LOCAL_CART_KEY = "toolor-demo-cart-v1";

export const localCartLineSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  name: z.string(),
  variantId: z.string(),
  quantity: z.number().int().positive(),
  unitAmount: z.number().int().nonnegative(),
  currencyCode: z.literal("KGS"),
  imageUrl: z.string().url().optional(),
  imageUrls: z.array(z.string().url()).optional(),
  variantTitle: z.string().optional(),
});

export const localCartSchema = z.array(localCartLineSchema);
export type LocalCartLine = z.infer<typeof localCartLineSchema>;

export function readLocalCart(value: string | null): LocalCartLine[] {
  if (!value) return [];
  try {
    return localCartSchema.parse(JSON.parse(value));
  } catch {
    return [];
  }
}

export function writeLocalCart(lines: LocalCartLine[]) {
  window.localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(lines));
  window.dispatchEvent(new Event("toolor-cart-change"));
}
