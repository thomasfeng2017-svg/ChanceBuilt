"use server";

import { revalidatePath } from "next/cache";
import type { AppointmentStatus, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireWriter } from "@/lib/auth";
import { sendBookingConfirmed } from "@/lib/email";
import { markOrderPaid } from "@/lib/orders";

const ORDER_STATUSES: OrderStatus[] = ["PENDING", "PAID", "SHIPPED", "CANCELLED"];
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
