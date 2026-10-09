import { z } from "zod";

import { locales } from "@/i18n/config";

const singleLine = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((value) => !/[\r\n\u0000-\u001f\u007f]/.test(value));

export const customerSchema = z
  .object({
    name: singleLine(2, 100),
    phone: singleLine(9, 30)
      .regex(/^[+()\-\s\d]+$/)
      .refine((value) => {
        const digits = value.replace(/\D/g, "").length;
        return digits >= 9 && digits <= 15;
      }),
    email: z.union([z.literal(""), z.email().max(254)]),
    city: singleLine(2, 100),
    address: singleLine(5, 300),
    comment: z
      .string()
      .trim()
      .max(1000)
      .refine(
        (value) =>
          !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value),
      ),
  })
  .strict();

export const checkoutRequestSchema = z
  .object({
    requestId: z.uuid(),
    locale: z.enum(locales),
    customer: customerSchema,
    delivery: z.enum(["bishkek", "regions", "international"]),
    consent: z.literal(true),
    website: z.literal(""),
    items: z
      .array(
        z
          .object({
            productId: singleLine(1, 200),
            slug: z
              .string()
              .max(200)
              .regex(/^[a-z0-9-]+$/),
            variantId: singleLine(1, 200),
            quantity: z.number().int().min(1).max(20),
            expectedUnitAmount: z.number().int().nonnegative().max(100_000_000),
          })
          .strict(),
      )
      .min(1)
      .max(20)
      .refine(
        (items) =>
          new Set(items.map((item) => item.variantId)).size === items.length,
      ),
  })
  .strict();

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const checkoutReplySchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), number: z.string() }),
  z.object({
    ok: z.literal(false),
    code: z.string(),
    number: z.string().optional(),
  }),
]);

/** A request reference, not a payment/stock-reservation confirmation. */
export function requestNumber(requestId: string) {
  return `TLR-${requestId.replaceAll("-", "").toUpperCase()}`;
}
