import { prisma } from "./db";
import { getShopSettings, getClosedDates, getUpcomingClosures } from "./settings";

/**
 * Appointment availability.
 *
 * The shop is in California; customers are not necessarily. Everything is
 * stored as a UTC instant and all opening-hours arithmetic is done in the
 * shop's timezone, so a customer booking from another state still sees the
 * shop's real 10am–6pm and daylight saving never shifts the calendar.
 */
export const SHOP_TZ = "America/Los_Angeles";

/** How many cars the shop can have in for work at the same time. */
export const BAYS = 2;

/** Slots are offered on this grid, in minutes. */
export const SLOT_GRANULARITY = 30;

/** Customers can't book within this many hours of now. */
export const MIN_LEAD_HOURS = 2;

/** How far ahead the calendar is open. */
export const BOOKING_HORIZON_DAYS = 45;

// --------------------------------------------------------------- timezone --

/** Offset of `tz` from UTC at the given instant, in milliseconds. */
function tzOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - date.getTime();
}

/**
 * Convert a shop-local calendar date + wall clock time into a UTC instant.
 * Two passes so the offset is correct on daylight-saving transition days.
 */
export function shopTimeToUtc(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm, 0, 0);

  let utc = naive - tzOffsetMs(new Date(naive), SHOP_TZ);
  utc = naive - tzOffsetMs(new Date(utc), SHOP_TZ);
  return new Date(utc);
}

/** The shop-local calendar date (YYYY-MM-DD) for an instant. */
export function shopDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Shop-local day of week, 0 = Sunday. */
export function shopWeekday(dateStr: string): number {
  // Midday avoids any DST edge at midnight.
  const noon = shopTimeToUtc(dateStr, "12:00");
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TZ,
    weekday: "short",
  }).format(noon);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

/**
 * The shop-local clock time as "HH:MM", 24-hour.
 *
 * Distinct from formatShopTime, which is for humans and returns "2:30 PM".
 * An <input type="time"> only accepts the 24-hour form, and feeding it the
 * display string silently leaves the field blank.
 */
export function shopTimeString(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  // Intl can emit "24" for midnight in some runtimes; normalise it.
  const hh = get("hour") === "24" ? "00" : get("hour");
  return hh + ":" + get("minute");
}

/** Format an instant as a shop-local time like "10:30 AM". */
export function formatShopTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Format an instant as a full shop-local date and time. */
export function formatShopDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatShopDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(shopTimeToUtc(dateStr, "12:00"));
}

// -------------------------------------------------------------- calendar --

/**
 * The next N shop-local dates from today, with an open/closed flag.
 *
 * Async now because both the opening hours and the closure list come from the
 * database. A day is open only if the weekday has hours AND no closure covers
 * it, so a holiday shuts the calendar without anyone editing the weekly hours
 * and forgetting to put them back.
 */
export async function upcomingDates(
  count = 14,
): Promise<Array<{ date: string; weekday: number; open: boolean; closureReason?: string }>> {
  const [{ SITE }, closures] = await Promise.all([getShopSettings(), getUpcomingClosures()]);

  const todayStr = shopDateString(new Date());
  const [y, m, d] = todayStr.split("-").map(Number);

  const reasonFor = (date: string) => {
    const hit = closures.find(
      (c) =>
        date >= c.startsOn.toISOString().slice(0, 10) &&
        date <= c.endsOn.toISOString().slice(0, 10),
    );
    return hit?.reason;
  };

  const out: Array<{ date: string; weekday: number; open: boolean; closureReason?: string }> = [];
  for (let i = 0; i < count; i++) {
    // Step through calendar days in UTC-space; only the Y/M/D matters here.
    const day = new Date(Date.UTC(y, m - 1, d + i));
    const date = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, "0")}-${String(day.getUTCDate()).padStart(2, "0")}`;
    const weekday = shopWeekday(date);
    const closureReason = reasonFor(date);
    out.push({
      date,
      weekday,
      open: SITE.hours[weekday] !== null && !closureReason,
      closureReason,
    });
  }
  return out;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const toHHMM = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export type Slot = {
  /** ISO instant for the slot start. */
  startsAt: string;
  /** Shop-local display label, e.g. "10:30 AM". */
  label: string;
  available: boolean;
  /** Why it isn't available — shown as a tooltip rather than hiding the slot. */
  reason?: "booked" | "past" | "too-late";
};

/**
 * All slots for one day and one service.
 *
 * A slot is offered when the job fits entirely inside opening hours and the
 * shop has a free bay for its whole duration. Unavailable slots are returned
 * rather than filtered out so the customer can see the day is busy instead of
 * wondering why the afternoon vanished.
 */
export async function getSlotsForDay(dateStr: string, durationMinutes: number): Promise<Slot[]> {
  const [{ SITE }, closed] = await Promise.all([getShopSettings(), getClosedDates()]);

  const weekday = shopWeekday(dateStr);
  const hours = SITE.hours[weekday];
  if (!hours) return [];
  // A closure beats the weekly hours.
  if (closed.has(dateStr)) return [];

  const openMin = toMinutes(hours.open);
  const closeMin = toMinutes(hours.close);
  const lastStart = closeMin - durationMinutes;
  if (lastStart < openMin) {
    // Job is longer than the working day — offer the opening slot only; it
    // becomes a drop-off that carries into the next day.
    return [
      {
        startsAt: shopTimeToUtc(dateStr, hours.open).toISOString(),
        label: formatShopTime(shopTimeToUtc(dateStr, hours.open)),
        available: true,
      },
    ];
  }

  // Existing bookings that could overlap this day.
  const dayStart = shopTimeToUtc(dateStr, "00:00");
  const dayEnd = new Date(dayStart.getTime() + 36 * 60 * 60 * 1000);
  const existing = await prisma.appointment.findMany({
    where: {
      status: { in: ["REQUESTED", "CONFIRMED"] },
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart },
    },
    select: { startsAt: true, endsAt: true },
  });

  const cutoff = Date.now() + MIN_LEAD_HOURS * 60 * 60 * 1000;
  const slots: Slot[] = [];

  for (let min = openMin; min <= lastStart; min += SLOT_GRANULARITY) {
    const start = shopTimeToUtc(dateStr, toHHMM(min));
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    let available = true;
    let reason: Slot["reason"];

    if (start.getTime() < cutoff) {
      available = false;
      reason = "past";
    } else {
      // Count how many bays are busy for any part of this slot.
      const overlapping = existing.filter(
        (a) => a.startsAt < end && a.endsAt > start,
      ).length;
      if (overlapping >= BAYS) {
        available = false;
        reason = "booked";
      }
    }

    slots.push({
      startsAt: start.toISOString(),
      label: formatShopTime(start),
      available,
      reason,
    });
  }

  return slots;
}

/**
 * Re-check a slot at booking time and create the appointment.
 * The availability check and the insert are wrapped in a transaction so two
 * customers clicking the same slot at the same moment can't both win.
 */
export async function reserveSlot(input: {
  serviceId: string;
  startsAt: Date;
  customerName: string;
  email: string;
  phone: string;
  notes?: string;
  vehicle?: {
    year: number;
    make: string;
    model: string;
    chassis?: string | null;
    modelId?: string | null;
  } | null;
  /** Set when the booking was made by a signed-in account. */
  customerId?: string | null;
  /** The car from that account's garage, when one was selected. */
  garageVehicleId?: string | null;
}): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service || !service.active) {
    return { ok: false, error: "That service is no longer available." };
  }

  const start = input.startsAt;
  const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);

  if (start.getTime() < Date.now() + MIN_LEAD_HOURS * 60 * 60 * 1000) {
    return { ok: false, error: "That time has passed. Please pick another slot." };
  }

  // Re-checked server side rather than trusting the calendar the customer saw,
  // which may have been rendered before a closure was added.
  const dateStr = shopDateString(start);
  const [{ SITE }, closed] = await Promise.all([getShopSettings(), getClosedDates()]);
  const weekday = shopWeekday(dateStr);

  if (SITE.hours[weekday] === null || closed.has(dateStr)) {
    return { ok: false, error: "The shop is closed that day." };
  }

  const reference = `CB-${start.getTime().toString(36).toUpperCase().slice(-6)}${Math.floor(
    100 + Math.random() * 900,
  )}`;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const overlapping = await tx.appointment.count({
        where: {
          status: { in: ["REQUESTED", "CONFIRMED"] },
          startsAt: { lt: end },
          endsAt: { gt: start },
        },
      });
      if (overlapping >= BAYS) return null;

      return tx.appointment.create({
        data: {
          reference,
          serviceId: service.id,
          startsAt: start,
          endsAt: end,
          customerName: input.customerName,
          email: input.email,
          phone: input.phone,
          notes: input.notes || null,
          vehicleYear: input.vehicle?.year ?? null,
          vehicleMake: input.vehicle?.make ?? null,
          vehicleModel: input.vehicle?.model ?? null,
          vehicleChassis: input.vehicle?.chassis ?? null,
          modelId: input.vehicle?.modelId ?? null,
          customerId: input.customerId ?? null,
          garageVehicleId: input.garageVehicleId ?? null,
        },
      });
    });

    if (!created) {
      return { ok: false, error: "Someone just took that slot. Please pick another time." };
    }
    return { ok: true, reference: created.reference };
  } catch {
    return { ok: false, error: "We couldn't save that booking. Please try again." };
  }
}
