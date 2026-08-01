"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireWriter } from "@/lib/auth";

/**
 * Log work the shop did on a customer's car.
 *
 * Lands as INSTALLED_BY_SHOP rather than OWNER, so the build sheet keeps the
 * distinction between "we fitted this and stand behind it" and "the owner says
 * it's on there". That distinction is the reason the shop bothers reading the
 * sheet before it tunes anything.
 */
export async function addShopModAction(
  _prev: { ok: false; error: string } | null,
  formData: FormData,
) {
  await requireWriter("STAFF");

  const vehicleId = String(formData.get("vehicleId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { ok: false as const, error: "Give the work a name." };

  const vehicle = await prisma.garageVehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, customerId: true },
  });
  if (!vehicle) return { ok: false as const, error: "That car no longer exists." };

  const installedRaw = String(formData.get("installedAt") ?? "").trim();
  const installedAt = installedRaw ? new Date(installedRaw) : new Date();

  await prisma.mod.create({
    data: {
      vehicleId,
      name,
      category: String(formData.get("category") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      installedAt: Number.isNaN(installedAt.getTime()) ? new Date() : installedAt,
      source: "INSTALLED_BY_SHOP",
    },
  });

  revalidatePath(`/admin/customers/${vehicle.customerId}`);
  return null;
}

/**
 * Remove an entry the shop added.
 *
 * Scoped to INSTALLED_BY_SHOP on purpose: staff can undo their own mistakes but
 * cannot quietly edit a customer's own record of their car.
 */
export async function removeShopModAction(modId: string, customerId: string) {
  await requireWriter("STAFF");
  await prisma.mod.deleteMany({ where: { id: modId, source: "INSTALLED_BY_SHOP" } });
  revalidatePath(`/admin/customers/${customerId}`);
}
