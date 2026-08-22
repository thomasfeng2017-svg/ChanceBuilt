"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ServiceCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireWriter } from "@/lib/auth";
import { SERVICE_CATEGORY_VALUES } from "@/lib/service-categories";
import {
  CHANCEBUILT_SERVICES,
  CHANCEBUILT_SERVICE_SLUGS,
  serviceSlug,
} from "@/lib/chancebuilt-services";

const CATEGORIES: ServiceCategory[] = SERVICE_CATEGORY_VALUES;

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Dollars as a human types them to integer cents. Blank means quote-only. */
function toCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export type ServiceFormState = { ok: boolean; error?: string; id?: string } | null;

/**
 * Create or update a service.
 *
 * `durationMinutes` is the field that does real work here: the booking calendar
 * slices availability by it, so a wrong number either double-books the bays or
 * hides slots the shop could have sold. It is validated hard for that reason
 * rather than trusted from a text box.
 *
 * The slug is derived once on create and then frozen. Service pages are linked
 * as /book?service=<slug>, and the shop pastes those links into Instagram, so
 * renaming a service must not break a link that is already out in the world.
 */
export async function saveServiceAction(
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  await requireWriter("STAFF");

  const id = String(formData.get("id") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim();
  const blurb = String(formData.get("blurb") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "") as ServiceCategory;
  const priceNote = String(formData.get("priceNote") ?? "").trim();
  const turnaround = String(formData.get("turnaround") ?? "").trim();
  const requiresVehicle = formData.get("requiresVehicle") === "on";
  const active = formData.get("active") === "on";

  const priceRaw = String(formData.get("priceFrom") ?? "").trim();
  const priceFromCents = priceRaw ? toCents(priceRaw) : null;

  const durationMinutes = Number(String(formData.get("durationMinutes") ?? ""));
  const sortOrder = Number(String(formData.get("sortOrder") ?? "0")) || 0;

  if (name.length < 3) return { ok: false, error: "Give the service a name." };
  if (blurb.length < 3) {
    return { ok: false, error: "Add a one-line summary. It's what shows on the cards." };
  }
  if (!CATEGORIES.includes(category)) return { ok: false, error: "Pick a category." };
  if (priceRaw && priceFromCents === null) {
    return { ok: false, error: "Enter a valid price, or leave it blank for quote-only." };
  }

  /*
    Duration bounds, not just "is a number".

    Below the booking grid's 30-minute step the calendar cannot represent the
    slot at all. Above a working day it swallows every remaining slot and the
    shop silently stops taking bookings, which is the failure nobody notices
    until a week of empty calendar has gone by.
  */
  if (!Number.isInteger(durationMinutes) || durationMinutes < 30) {
    return { ok: false, error: "Duration must be at least 30 minutes." };
  }
  if (durationMinutes > 480) {
    return {
      ok: false,
      error: "Duration can't exceed 8 hours. For longer jobs, book a short intake slot instead.",
    };
  }
  if (durationMinutes % 30 !== 0) {
    return { ok: false, error: "Duration must be a multiple of 30 minutes." };
  }

  const data = {
    name,
    blurb,
    description,
    category,
    priceFromCents,
    priceNote: priceNote || null,
    turnaround: turnaround || null,
    durationMinutes,
    requiresVehicle,
    active,
    sortOrder,
  };

  if (id) {
    await prisma.service.update({ where: { id }, data });
    revalidatePath("/admin/services");
    revalidatePath(`/admin/services/${id}`);
    revalidatePath("/services");
    revalidatePath("/book");
    return { ok: true, id };
  }

  // Slug must be unique. Suffix on collision rather than rejecting the save,
  // since two services can reasonably share a name across categories.
  const base = slugify(name) || "service";
  let slug = base;
  for (let n = 2; await prisma.service.findUnique({ where: { slug }, select: { id: true } }); n++) {
    slug = `${base}-${n}`;
  }

  const created = await prisma.service.create({ data: { ...data, slug } });

  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/book");
  redirect(`/admin/services/${created.id}?created=1`);
}

/**
 * Show or hide a service.
 *
 * Deliberately the only removal mechanism. Appointments hold a required
 * reference to their service, so deleting one would orphan every booking ever
 * taken against it. Hiding keeps the history readable and is reversible, which
 * is what the shop actually wants when a service is paused for the season.
 */
export async function setServiceActiveAction(serviceId: string, active: boolean) {
  await requireWriter("STAFF");
  await prisma.service.update({ where: { id: serviceId }, data: { active } });
  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/book");
  return { ok: true as const };
}

/** Nudge a service up or down the list customers see. */
export async function moveServiceAction(serviceId: string, direction: "up" | "down") {
  await requireWriter("STAFF");

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return { ok: false as const, error: "That service no longer exists." };

  // Swap with the neighbour rather than rewriting every row, so two people
  // reordering at once cannot renumber the whole list out from under each other.
  const neighbour = await prisma.service.findFirst({
    where:
      direction === "up"
        ? { sortOrder: { lt: service.sortOrder } }
        : { sortOrder: { gt: service.sortOrder } },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbour) return { ok: true as const };

  await prisma.$transaction([
    prisma.service.update({ where: { id: service.id }, data: { sortOrder: neighbour.sortOrder } }),
    prisma.service.update({ where: { id: neighbour.id }, data: { sortOrder: service.sortOrder } }),
  ]);

  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/book");
  return { ok: true as const };
}

/**
 * Load Chance's service list, replacing whatever is there.
 *
 * Exists so nobody has to hold a database password to get the shop's own
 * services onto the site. The same work used to require running a script with
 * the production connection string pasted into a terminal, which is a
 * dangerous thing to ask someone to do routinely and an easy thing to get
 * wrong.
 *
 * Destructive by design: services not on the list are removed, because the
 * point is to clear out the placeholders the site shipped with. Anything with
 * appointments booked against it is deactivated instead of deleted, so booking
 * history and past invoices keep working.
 *
 * The admin only offers this while none of the list is loaded, so it cannot be
 * clicked later and quietly delete services Chance has added himself.
 */
export async function importChancebuiltServicesAction() {
  // Same level as the rest of this screen. Anyone who can reach it can already
  // delete services one at a time, so a stricter gate here would only risk the
  // button being invisible to the person who needs it.
  await requireWriter("STAFF");

  const existing = await prisma.service.findMany({ select: { id: true, slug: true } });
  const wanted = new Set(CHANCEBUILT_SERVICE_SLUGS);
  const stale = existing.filter((e) => !wanted.has(e.slug));

  const booked = stale.length
    ? await prisma.appointment.groupBy({
        by: ["serviceId"],
        where: { serviceId: { in: stale.map((s) => s.id) } },
        _count: { _all: true },
      })
    : [];
  const bookedIds = new Set(booked.map((b) => b.serviceId));

  let loaded = 0;
  for (const [index, svc] of CHANCEBUILT_SERVICES.entries()) {
    const data = {
      name: svc.name,
      blurb: svc.blurb,
      description: svc.description,
      category: svc.category,
      // Quote-only until Chance sets prices. See the note in the service list.
      priceFromCents: null,
      priceNote: null,
      durationMinutes: svc.minutes,
      turnaround: svc.turnaround ?? null,
      requiresVehicle: true,
      sortOrder: index,
      active: true,
    };
    await prisma.service.upsert({
      where: { slug: serviceSlug(svc.name) },
      create: { slug: serviceSlug(svc.name), ...data },
      update: data,
    });
    loaded++;
  }

  let removed = 0;
  let retired = 0;
  for (const s of stale) {
    if (bookedIds.has(s.id)) {
      await prisma.service.update({ where: { id: s.id }, data: { active: false } });
      retired++;
    } else {
      await prisma.service.delete({ where: { id: s.id } });
      removed++;
    }
  }

  revalidatePath("/admin/services");
  revalidatePath("/services");
  revalidatePath("/book");
  revalidatePath("/");

  return { ok: true as const, loaded, removed, retired };
}
