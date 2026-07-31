"use server";

import { revalidatePath } from "next/cache";
import type { AppointmentStatus, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireWriter } from "@/lib/auth";
import { sendBookingConfirmed, sendOrderShipped } from "@/lib/email";
import { markOrderPaid, toEmailData } from "@/lib/orders";

const ORDER_STATUSES: OrderStatus[] = ["PENDING", "PAID", "SHIPPED", "CANCELLED"];

/**
 * Mark an order dispatched, record the tracking, and tell the customer.
 *
 * Separate from the plain status dropdown because shipping is the one
 * transition that needs information alongside it. Making the shop set the
 * status and then remember to fill in a tracking box afterwards is how
 * customers end up with a "shipped" email and no way to find the parcel.
 *
 * The email fires only on the transition INTO shipped, so correcting a typo in
 * the tracking number afterwards does not send a second one. Re-notifying is
 * deliberately a separate decision.
 */
export async function markOrderShippedAction(
  orderId: string,
  input: { carrier: string; trackingNumber: string; notify: boolean },
) {
  await requireWriter("STAFF");

  const carrier = input.carrier.trim() || null;
  const trackingNumber = input.trackingNumber.trim() || null;

  /*
    Carrier and tracking are both required, checked here rather than only in
    the form. Client-side validation is a convenience; this is the rule.

    Two reasons, and the second is the serious one:

    Telling someone their order shipped without a way to find the parcel
    generates a support call instead of preventing one.

    More importantly, this shop sells parts costing thousands. Proof of
    delivery is what wins a chargeback: card networks put the burden on the
    merchant, and "we posted it" without a carrier and a number is not
    evidence. An order marked shipped with nothing recorded is an order that
    cannot be defended if the customer disputes it.
  */
  if (!trackingNumber || !carrier) {
    return {
      ok: false as const,
      error: !carrier
        ? "Enter the carrier before marking this order shipped."
        : "Enter a tracking number before marking this order shipped.",
    };
  }

  const before = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "SHIPPED",
      carrier,
      trackingNumber,
      // Preserve the original dispatch date if this is an edit, not a re-ship.
      shippedAt: before?.status === "SHIPPED" ? undefined : new Date(),
    },
    include: { items: true },
  });

  const firstTime = before?.status !== "SHIPPED";
  let emailed = false;

  if (firstTime && input.notify) {
    // Never let an email failure undo a dispatch that has already happened.
    const [result] = await Promise.allSettled([
      sendOrderShipped({ ...toEmailData(order), carrier, trackingNumber }),
    ]);
    emailed = result.status === "fulfilled" && result.value === true;
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${order.number}`);
  revalidatePath("/admin");

  return { ok: true as const, emailed, firstTime };
}
const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "REQUESTED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
];

/**
 * Move an order along. Marking an order PAID here is a manual override for
 * cash/bank-transfer sales — once Stripe is wired, the webhook should be the
 * only thing that sets PAID for card payments.
 */
export async function setOrderStatusAction(orderId: string, status: string) {
  await requireWriter("STAFF");

  if (!ORDER_STATUSES.includes(status as OrderStatus)) {
    return { ok: false as const, error: "Unknown order status." };
  }

  // Manual "mark as paid" for cash or bank transfer. The payment side effects
  // (stock, receipts) run through the same idempotent path as the Stripe
  // webhook, so doing both only decrements stock once and sends one receipt.
  if (status === "PAID") {
    await markOrderPaid({ orderId });
  }

  // The status write is separate and unconditional. Gating it behind the
  // idempotency check meant setting an already-paid order back to PAID (after
  // a mis-click through SHIPPED, say) silently did nothing.
  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status: status as OrderStatus },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${order.number}`);
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function setAppointmentStatusAction(appointmentId: string, status: string) {
  await requireWriter("STAFF");

  if (!APPOINTMENT_STATUSES.includes(status as AppointmentStatus)) {
    return { ok: false as const, error: "Unknown appointment status." };
  }

  const before = await prisma.appointment.findUnique({ where: { id: appointmentId } });

  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: status as AppointmentStatus },
    include: { service: true },
  });

  // Tell the customer when a request becomes a confirmed booking. Only on the
  // transition, so re-saving the same status doesn't email them again.
  if (status === "CONFIRMED" && before?.status !== "CONFIRMED") {
    await Promise.allSettled([
      sendBookingConfirmed({
        reference: appointment.reference,
        customerName: appointment.customerName,
        email: appointment.email,
        phone: appointment.phone,
        serviceName: appointment.service.name,
        startsAt: appointment.startsAt,
        vehicle:
          [
            appointment.vehicleYear,
            appointment.vehicleMake,
            appointment.vehicleModel,
            appointment.vehicleChassis ? `(${appointment.vehicleChassis})` : null,
          ]
            .filter(Boolean)
            .join(" ") || null,
        notes: appointment.notes,
      }),
    ]);
  }

  revalidatePath("/admin/appointments");
  revalidatePath(`/admin/appointments/${appointment.reference}`);
  revalidatePath("/admin");
  return { ok: true as const };
}
