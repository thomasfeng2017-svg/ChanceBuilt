"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireWriter } from "@/lib/auth";
import { BAYS, shopTimeToUtc, shopDateString, shopWeekday } from "@/lib/booking";
import { getShopSettings, getClosedDates } from "@/lib/settings";

export type AppointmentEditState = { ok: boolean; error?: string } | null;

/**
 * Edit a booking from the admin.
 *
 * The shop needs this the moment a customer phones to say "can we make it
 * Thursday" or spells their number wrong. Before this the only editable field
 * was status, so every correction meant cancelling and rebooking, which loses
 * the reference the customer was given.
 *
 * Rescheduling goes through the same capacity check as a public booking, minus
 * this appointment itself. Without that exclusion an appointment would collide
 * with its own existing row and the shop could never move a booking within the
 * same slot, which is the most common edit there is.
 *
 * Staff are deliberately allowed past two guards the public booking enforces:
 * the two-hour lead time and the 45-day horizon. Someone standing at the
 * counter booking a car in for this afternoon is normal, and refusing it would
 * only push the shop back to pen and paper.
 */
export async function updateAppointmentAction(
  _prev: AppointmentEditState,
  formData: FormData,
): Promise<AppointmentEditState> {
  await requireWriter("STAFF");

  const id = String(formData.get("id") ?? "");
  const customerName = String(formData.get("customerName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const serviceId = String(formData.get("serviceId") ?? "");
  const date = String(formData.get("date") ?? "").trim();
  const time = String(formData.get("time") ?? "").trim();

  const vehicleYearRaw = String(formData.get("vehicleYear") ?? "").trim();
  const vehicleMake = String(formData.get("vehicleMake") ?? "").trim();
  const vehicleModel = String(formData.get("vehicleModel") ?? "").trim();
  const vehicleChassis = String(formData.get("vehicleChassis") ?? "").trim();

  if (customerName.length < 2) return { ok: false, error: "Enter the customer's name." };
  if (!email.includes("@")) return { ok: false, error: "Enter a valid email address." };
  if (phone.replace(/\D/g, "").length < 10) {
    return { ok: false, error: "Enter a valid phone number." };
  }
  if (!date || !time) return { ok: false, error: "Pick a date and time." };

  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "That appointment no longer exists." };

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return { ok: false, error: "Pick a service." };

  // Interpreted in the shop's timezone, not the browser's. Staff could be
  // anywhere, and the calendar is anchored to Riverside.
  const startsAt = shopTimeToUtc(date, time);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, error: "That date and time didn't parse." };
  }
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60 * 1000);

  const dateStr = shopDateString(startsAt);
  const [{ SITE }, closed] = await Promise.all([getShopSettings(), getClosedDates()]);

  /*
    Closed days are a warning here rather than a refusal.

    The shop legitimately books people in on a day it is normally shut, and the
    admin is staff-only, so the guard that protects the public calendar becomes
    an obstruction here. The list page flags these so they are visible rather
    than silent.
  */
  const outsideHours = SITE.hours[shopWeekday(dateStr)] === null || closed.has(dateStr);

  // Capacity, excluding this appointment. Cancelled bookings free their bay.
  const overlapping = await prisma.appointment.count({
    where: {
      id: { not: id },
      status: { in: ["REQUESTED", "CONFIRMED"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
  if (overlapping >= BAYS) {
    return {
      ok: false,
      error: `All ${BAYS} bays are already booked across that time. Pick another slot.`,
    };
  }

  const vehicleYear = vehicleYearRaw ? Number(vehicleYearRaw) : null;
  if (vehicleYearRaw && (!Number.isInteger(vehicleYear) || vehicleYear! < 1980)) {
    return { ok: false, error: "Enter a valid vehicle year, or leave it blank." };
  }

  await prisma.appointment.update({
    where: { id },
    data: {
      customerName,
      email,
      phone,
      notes: notes || null,
      serviceId,
      startsAt,
      endsAt,
      vehicleYear,
      vehicleMake: vehicleMake || null,
      vehicleModel: vehicleModel || null,
      vehicleChassis: vehicleChassis || null,
    },
  });

  revalidatePath("/admin/appointments");
  revalidatePath(`/admin/appointments/${existing.reference}`);
  revalidatePath("/admin");
  revalidatePath("/book");

  return {
    ok: true,
    error: outsideHours
      ? "Saved. Note that falls outside normal opening hours."
      : undefined,
  };
}
