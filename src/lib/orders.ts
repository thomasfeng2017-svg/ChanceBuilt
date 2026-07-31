import "server-only";
import { prisma } from "./db";
import { sendOrderConfirmation, sendOrderAlert, type OrderEmailData } from "./email";

/**
 * Order lifecycle helpers shared by checkout, the Stripe webhook and the admin.
 */

export type ShippingAddress = {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal?: string | null;
  country?: string | null;
};

export function toEmailData(order: {
  number: string;
  email: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  vehicleLabel: string | null;
  shipName: string | null;
  shipLine1: string | null;
  shipLine2: string | null;
  shipCity: string | null;
  shipState: string | null;
  shipPostal: string | null;
  items: Array<{ name: string; sku: string; quantity: number; unitPriceCents: number }>;
}): OrderEmailData {
  return {
    number: order.number,
    email: order.email,
    items: order.items,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    vehicleLabel: order.vehicleLabel,
    shipping: {
      name: order.shipName,
      line1: order.shipLine1,
      line2: order.shipLine2,
      city: order.shipCity,
      state: order.shipState,
      postal: order.shipPostal,
    },
  };
}

/**
 * Mark an order paid exactly once.
 *
 * Stripe retries webhooks, and the same event can legitimately arrive more than
 * once, so this has to be idempotent. The `paidAt IS NULL` condition in the
 * update is what guarantees it: a second delivery updates zero rows and returns
 * early, so stock is never decremented twice and the customer never gets two
 * receipts.
 */
export async function markOrderPaid(input: {
  orderId: string;
  paymentIntentId?: string | null;
  email?: string | null;
  shipping?: ShippingAddress | null;
}): Promise<{ alreadyPaid: boolean }> {
  const claimed = await prisma.order.updateMany({
    where: { id: input.orderId, paidAt: null },
    data: {
      status: "PAID",
      paidAt: new Date(),
      stripePaymentIntentId: input.paymentIntentId ?? undefined,
      ...(input.email ? { email: input.email } : {}),
      ...(input.shipping
        ? {
            shipName: input.shipping.name ?? undefined,
            shipLine1: input.shipping.line1 ?? undefined,
            shipLine2: input.shipping.line2 ?? undefined,
            shipCity: input.shipping.city ?? undefined,
            shipState: input.shipping.state ?? undefined,
            shipPostal: input.shipping.postal ?? undefined,
            shipCountry: input.shipping.country ?? undefined,
          }
        : {}),
    },
  });

  // Another delivery of the same event got here first.
  if (claimed.count === 0) return { alreadyPaid: true };

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { items: true },
  });
  if (!order) return { alreadyPaid: false };

  // Stock comes down at payment, not at checkout, so an abandoned cart never
  // holds inventory hostage.
  await Promise.all(
    order.items.map((item) =>
      prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      }),
    ),
  );

  const emailData = toEmailData(order);
  // Deliberately not awaited together with a throw: email failures must not
  // fail the webhook, or Stripe will retry a payment we've already processed.
  await Promise.allSettled([sendOrderConfirmation(emailData), sendOrderAlert(emailData)]);

  return { alreadyPaid: false };
}
