"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  GARAGE_COOKIE,
  GARAGE_MAX_AGE,
  getVehicle,
  vehicleLabel,
  type Vehicle,
} from "@/lib/garage";
import { reserveSlot } from "@/lib/booking";
import { stripe, stripeConfigured, baseUrl } from "@/lib/stripe";
import { sendBookingReceived, sendBookingAlert } from "@/lib/email";
import {
  CART_COOKIE,
  CART_MAX_AGE,
  MAX_QTY_PER_LINE,
  getCartLines,
  getDetailedCart,
  type CartLine,
} from "@/lib/cart";

// ----------------------------------------------------------------- garage --

/**
 * Persist the selected vehicle. The ids are re-validated against the database
 * so a hand-edited cookie can't put a bogus vehicle in the garage — the whole
 * catalog is filtered by these values.
 */
export async function setVehicleAction(input: {
  year: number;
  makeId: string;
  modelId: string;
  redirectTo?: string;
}) {
  const model = await prisma.model.findUnique({
    where: { id: input.modelId },
    include: { make: true },
  });

  if (!model || model.makeId !== input.makeId) {
    return { ok: false as const, error: "That vehicle isn't in our catalog." };
  }
  if (input.year < model.yearStart || input.year > model.yearEnd) {
    return {
      ok: false as const,
      error: `We don't list a ${input.year} ${model.make.name} ${model.name}.`,
    };
  }

  const vehicle: Vehicle = {
    year: input.year,
    makeId: model.make.id,
    makeName: model.make.name,
    modelId: model.id,
    modelName: model.name,
    chassis: model.chassis,
  };

  (await cookies()).set(GARAGE_COOKIE, JSON.stringify(vehicle), {
    maxAge: GARAGE_MAX_AGE,
    httpOnly: false, // read by the client selector to pre-fill its dropdowns
    sameSite: "lax",
    path: "/",
  });

  revalidatePath("/", "layout");

  if (input.redirectTo) redirect(input.redirectTo);
  return { ok: true as const, vehicle };
}

export async function clearVehicleAction() {
  (await cookies()).delete(GARAGE_COOKIE);
  revalidatePath("/", "layout");
}

// ------------------------------------------------------------------- cart --

async function writeCart(lines: CartLine[]) {
  (await cookies()).set(CART_COOKIE, JSON.stringify(lines), {
    maxAge: CART_MAX_AGE,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
}

export async function addToCartAction(productId: string, quantity = 1) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, stock: true, category: { select: { kind: true } } },
  });
  if (!product) return { ok: false as const, error: "Product not found." };
  if (product.stock < 1) return { ok: false as const, error: "Out of stock." };

  const lines = await getCartLines();
  const existing = lines.find((l) => l.productId === productId);
  const requested = (existing?.quantity ?? 0) + Math.max(1, quantity);
  const capped = Math.min(requested, product.stock, MAX_QTY_PER_LINE);

  // Tag the line with the vehicle it was bought for — useful on the order and
  // when the customer comes back to a cart with parts for two different cars.
  // Merch is never bought "for" a car, so it stays untagged.
  const raw =
    product.category.kind === "MERCH"
      ? undefined
      : (await cookies()).get(GARAGE_COOKIE)?.value;
  let label: string | undefined;
  if (raw) {
    try {
      label = vehicleLabel(JSON.parse(raw) as Vehicle);
    } catch {
      label = undefined;
    }
  }

  if (existing) {
    existing.quantity = capped;
  } else {
    lines.push({ productId, quantity: capped, vehicleLabel: label });
  }

  await writeCart(lines);
  revalidatePath("/", "layout");
  return { ok: true as const, quantity: capped, cappedByStock: requested > capped };
}

export async function updateCartLineAction(productId: string, quantity: number) {
  const lines = await getCartLines();
  const next =
    quantity <= 0
      ? lines.filter((l) => l.productId !== productId)
      : lines.map((l) =>
          l.productId === productId
            ? { ...l, quantity: Math.min(quantity, MAX_QTY_PER_LINE) }
            : l,
        );
  await writeCart(next);
  revalidatePath("/", "layout");
}

export async function removeCartLineAction(productId: string) {
  await writeCart((await getCartLines()).filter((l) => l.productId !== productId));
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- booking --

/**
 * Book a service appointment.
 *
 * Availability is re-checked inside a transaction at this point — the slot
 * list the customer was looking at may be seconds out of date.
 */
export async function bookAppointmentAction(input: {
  serviceId: string;
  startsAt: string;
  customerName: string;
  email: string;
  phone: string;
  notes?: string;
  useGarageVehicle?: boolean;
  vehicleFreeText?: string;
}) {
  const name = input.customerName.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();

  if (name.length < 2) return { ok: false as const, error: "Please enter your name." };
  if (!email.includes("@")) return { ok: false as const, error: "Please enter a valid email." };
  if (phone.replace(/\D/g, "").length < 10) {
    return { ok: false as const, error: "Please enter a valid phone number." };
  }

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false as const, error: "Please pick an appointment time." };
  }

  // Prefer the garage vehicle; fall back to whatever they typed.
  let vehicle: Parameters<typeof reserveSlot>[0]["vehicle"] = null;
  const garage = await getVehicle();
  if (input.useGarageVehicle !== false && garage) {
    vehicle = {
      year: garage.year,
      make: garage.makeName,
      model: garage.modelName,
      chassis: garage.chassis ?? null,
      modelId: garage.modelId,
    };
  }

  const notes = [input.notes?.trim(), !vehicle && input.vehicleFreeText?.trim()
    ? `Vehicle: ${input.vehicleFreeText.trim()}`
    : null]
    .filter(Boolean)
    .join("\n\n");

  const result = await reserveSlot({
    serviceId: input.serviceId,
    startsAt,
    customerName: name,
    email,
    phone,
    notes: notes || undefined,
    vehicle,
  });

  if (!result.ok) return { ok: false as const, error: result.error };

  // Confirmation to the customer, alert to the shop. Email failure must not
  // lose a booking that's already in the database, hence allSettled.
  const created = await prisma.appointment.findUnique({
    where: { reference: result.reference },
    include: { service: true },
  });
  if (created) {
    const payload = {
      reference: created.reference,
      customerName: created.customerName,
      email: created.email,
      phone: created.phone,
      serviceName: created.service.name,
      startsAt: created.startsAt,
      vehicle:
        [
          created.vehicleYear,
          created.vehicleMake,
          created.vehicleModel,
          created.vehicleChassis ? `(${created.vehicleChassis})` : null,
        ]
          .filter(Boolean)
          .join(" ") || null,
      notes: created.notes,
    };
    await Promise.allSettled([sendBookingReceived(payload), sendBookingAlert(payload)]);
  }

  revalidatePath("/book");
  redirect(`/book/${result.reference}`);
}

// --------------------------------------------------------------- checkout --

/**
 * Start checkout.
 *
 * Creates a PENDING order from server-side prices (never from the cart cookie,
 * which the customer controls), then hands off to Stripe Checkout. The order is
 * only marked PAID by the webhook: the browser's return trip is not proof of
 * payment and must never be treated as such.
 *
 * If Stripe isn't configured yet, this falls back to recording an unpaid order
 * so the flow can still be demonstrated. The checkout page says so plainly.
 */
export async function placeOrderAction(_prevState: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !email.includes("@")) {
    return { ok: false as const, error: "Enter a valid email address." };
  }

  const cart = await getDetailedCart();
  if (cart.lines.length === 0) {
    return { ok: false as const, error: "Your cart is empty." };
  }

  // Re-check stock now, so we don't take money for something already sold.
  const oversold = cart.lines.filter((l) => l.quantity > l.stock);
  if (oversold.length > 0) {
    const names = oversold.map((l) => l.name).join(", ");
    return {
      ok: false as const,
      error: `Not enough stock for: ${names}. Adjust your cart and try again.`,
    };
  }

  const number = `CB${Date.now().toString(36).toUpperCase()}`;
  const vehicles = [...new Set(cart.lines.map((l) => l.vehicleLabel).filter(Boolean))];

  const order = await prisma.order.create({
    data: {
      number,
      email,
      subtotalCents: cart.subtotalCents,
      shippingCents: cart.shippingCents,
      taxCents: cart.taxCents,
      totalCents: cart.totalCents,
      vehicleLabel: vehicles.join(", ") || null,
      items: {
        create: cart.lines.map((l) => ({
          productId: l.productId,
          name: l.name,
          sku: l.sku,
          unitPriceCents: l.priceCents,
          quantity: l.quantity,
        })),
      },
    },
  });

  if (!stripeConfigured()) {
    // No payment processor yet: record the order and clear the cart so the
    // shop can follow up manually.
    (await cookies()).delete(CART_COOKIE);
    revalidatePath("/", "layout");
    redirect(`/order/${order.number}`);
  }

  const site = baseUrl();
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    client_reference_id: order.number,
    metadata: { orderId: order.id, orderNumber: order.number },
    // Physical goods, so collect an address.
    shipping_address_collection: { allowed_countries: ["US"] },
    line_items: [
      ...cart.lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: "usd",
          unit_amount: l.priceCents,
          product_data: {
            name: l.name,
            description: `${l.brandName} - ${l.sku}`,
          },
        },
      })),
      ...(cart.shippingCents > 0
        ? [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: cart.shippingCents,
                product_data: { name: "Shipping" },
              },
            },
          ]
        : []),
      ...(cart.taxCents > 0
        ? [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: cart.taxCents,
                product_data: { name: "Sales tax" },
              },
            },
          ]
        : []),
    ],
    success_url: `${site}/order/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/cart`,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  if (!session.url) {
    return { ok: false as const, error: "Couldn't start checkout. Please try again." };
  }

  redirect(session.url);
}
