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

  await recordBuildSheetEntries(input.orderId);

  const emailData = toEmailData(order);
  // Deliberately not awaited together with a throw: email failures must not
  // fail the webhook, or Stripe will retry a payment we've already processed.
  await Promise.allSettled([sendOrderConfirmation(emailData), sendOrderAlert(emailData)]);

  return { alreadyPaid: false };
}

/**
 * Turn a paid order into build-sheet entries.
 *
 * Only runs when the customer was signed in AND had one of their own cars
 * selected at checkout, which is the only moment we can know which car a part
 * was bought for. Anything else stays claimable by hand from the build sheet.
 *
 * Merch is skipped, because a hoodie is not a modification. Failures are
 * swallowed: a build sheet is a convenience, and it must never be the reason a
 * payment webhook returns 500 and Stripe retries an order that is already paid.
 */
async function recordBuildSheetEntries(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: { category: { include: { parent: true } } },
            },
          },
        },
      },
    });
    if (!order?.garageVehicleId) return;

    const vehicleId = order.garageVehicleId;
    const parts = order.items.filter(
      (i) => i.product && i.product.category.kind === "PART",
    );
    if (parts.length === 0) return;

    // Skip anything already on this car's sheet, so a replayed webhook or a
    // part the owner added by hand does not show up twice.
    const existing = await prisma.mod.findMany({
      where: { vehicleId, productId: { in: parts.map((p) => p.productId) } },
      select: { productId: true },
    });
    const seen = new Set(existing.map((m) => m.productId));

    const fresh = parts.filter((p) => !seen.has(p.productId));
    if (fresh.length === 0) return;

    await prisma.mod.createMany({
      data: fresh.map((item) => ({
        vehicleId,
        name: item.name,
        category:
          item.product?.category.parent?.name ?? item.product?.category.name ?? null,
        installedAt: order.paidAt ?? new Date(),
        source: "PURCHASED" as const,
        productId: item.productId,
        orderId: order.id,
      })),
    });
  } catch (e) {
    console.error("[orders] couldn't record build sheet entries:", e);
  }
}
