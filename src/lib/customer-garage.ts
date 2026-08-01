import "server-only";
import { prisma } from "./db";
import type { Vehicle } from "./vehicle";

/**
 * Reading a customer's garage and build sheets.
 *
 * Every query here is scoped by customerId. Nothing takes a bare vehicle id and
 * trusts it: a garage vehicle id is a cuid that arrives from a form, and the
 * only thing standing between one customer's build sheet and another's is that
 * scoping, so it is done in the query rather than checked afterwards.
 */

export type GarageVehicleWithMods = Awaited<ReturnType<typeof getGarage>>[number];

export async function getGarage(customerId: string) {
  return prisma.garageVehicle.findMany({
    where: { customerId },
    include: {
      mods: { orderBy: [{ installedAt: "desc" }, { createdAt: "desc" }] },
      _count: { select: { mods: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * One car, but only if it belongs to this customer.
 *
 * Returns null rather than throwing on a mismatch, so callers treat "not yours"
 * and "does not exist" identically and the response cannot be used to probe
 * which ids are real.
 */
export async function getGarageVehicle(customerId: string, vehicleId: string) {
  return prisma.garageVehicle.findFirst({
    where: { id: vehicleId, customerId },
    include: {
      mods: {
        orderBy: [{ installedAt: "desc" }, { createdAt: "desc" }],
        include: { product: { select: { id: true, name: true, images: true } } },
      },
    },
  });
}

/** The cookie shape for a saved car, so selecting one drives fitment as usual. */
export function toCookieVehicle(v: {
  id: string;
  year: number;
  makeName: string;
  modelName: string;
  chassis: string | null;
  modelId: string | null;
}): Vehicle | null {
  // A car whose catalog Model has since been retired can still be displayed,
  // but cannot drive fitment filtering, which is keyed on real model ids.
  if (!v.modelId) return null;
  return {
    year: v.year,
    makeId: "",
    makeName: v.makeName,
    modelId: v.modelId,
    modelName: v.modelName,
    chassis: v.chassis,
    savedId: v.id,
  };
}

/**
 * Orders belonging to this customer that could still be added to a build.
 *
 * Only paid ones, and only parts: nobody wants a hoodie on their build sheet.
 * Items already turned into a mod for that car are filtered out by the caller,
 * which knows which car is being looked at.
 */
export async function getClaimableOrders(customerId: string) {
  return prisma.order.findMany({
    where: {
      customerId,
      status: { in: ["PAID", "SHIPPED"] },
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: { select: { name: true, kind: true, parent: { select: { name: true } } } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Part items from an order, with the merch dropped. */
export function partItems<
  T extends { product: { category: { kind: string } } | null },
>(items: T[]): T[] {
  return items.filter((i) => i.product && i.product.category.kind === "PART");
}
