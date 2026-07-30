"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireWriter } from "@/lib/auth";
import { GALLERY_SLOT } from "@/lib/image-slots";

/**
 * Every one of these revalidates the whole site layout, because a photo slot
 * can appear on any page and there is no cheap way to know which.
 */
function refresh() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/photos");
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Replace (or set) the single image or video in a slot. */
export async function setSlotImageAction(
  slot: string,
  url: string,
  kind: "IMAGE" | "VIDEO" = "IMAGE",
  posterUrl: string | null = null,
  /** Intrinsic size from the upload, so the gallery can lay it out unclipped. */
  width: number | null = null,
  height: number | null = null,
) {
  await requireWriter("STAFF");
  if (!url) return { ok: false as const, error: "Nothing was uploaded." };

  const existing = await prisma.siteImage.findFirst({
    where: { slot },
    orderBy: { sortOrder: "asc" },
  });

  if (existing) {
    // Keep alt text, reset the focal point: it belonged to the old photo.
    await prisma.siteImage.update({
      where: { id: existing.id },
      data: { url, kind, posterUrl, width, height, focalX: 50, focalY: 50, active: true },
    });
  } else {
    await prisma.siteImage.create({ data: { slot, url, kind, posterUrl, width, height } });
  }

  refresh();
  return { ok: true as const };
}

export async function clearSlotAction(slot: string) {
  await requireWriter("STAFF");
  await prisma.siteImage.deleteMany({ where: { slot } });
  refresh();
  return { ok: true as const };
}

/** Focal point, as percentages of the image. */
export async function setFocalPointAction(id: string, focalX: number, focalY: number) {
  await requireWriter("STAFF");
  await prisma.siteImage.update({
    where: { id },
    data: { focalX: clamp(focalX), focalY: clamp(focalY) },
  });
  refresh();
  return { ok: true as const };
}

export async function setImageTextAction(id: string, alt: string, caption: string) {
  await requireWriter("STAFF");
  await prisma.siteImage.update({
    where: { id },
    data: { alt: alt.trim(), caption: caption.trim() || null },
  });
  refresh();
  return { ok: true as const };
}

export async function setImageActiveAction(id: string, active: boolean) {
  await requireWriter("STAFF");
  await prisma.siteImage.update({ where: { id }, data: { active } });
  refresh();
  return { ok: true as const };
}

export async function deleteImageAction(id: string) {
  await requireWriter("STAFF");
  await prisma.siteImage.delete({ where: { id } });
  refresh();
  return { ok: true as const };
}

// ---------------------------------------------------------------- gallery --

export type NewMedia = {
  url: string;
  kind: "IMAGE" | "VIDEO";
  posterUrl: string | null;
  width?: number | null;
  height?: number | null;
};

export async function addGalleryImagesAction(items: NewMedia[]) {
  await requireWriter("STAFF");
  if (items.length === 0) return { ok: false as const, error: "Nothing to add." };

  const last = await prisma.siteImage.findFirst({
    where: { slot: GALLERY_SLOT },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  let next = (last?.sortOrder ?? -1) + 1;

  await prisma.siteImage.createMany({
    data: items.map((item) => ({
      slot: GALLERY_SLOT,
      url: item.url,
      kind: item.kind,
      posterUrl: item.posterUrl,
      width: item.width ?? null,
      height: item.height ?? null,
      sortOrder: next++,
    })),
  });

  refresh();
  return { ok: true as const, added: items.length };
}

/**
 * Move one gallery image up or down.
 *
 * Swapping with the neighbour keeps every other row untouched, so two people
 * reordering at once can't scramble the whole list the way "rewrite all
 * sortOrders" would.
 */
export async function moveGalleryImageAction(id: string, direction: "up" | "down") {
  await requireWriter("STAFF");

  const rows = await prisma.siteImage.findMany({
    where: { slot: GALLERY_SLOT },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });

  const index = rows.findIndex((r) => r.id === id);
  if (index === -1) return { ok: false as const, error: "Image not found." };

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= rows.length) return { ok: true as const };

  const a = rows[index];
  const b = rows[swapWith];

  await prisma.$transaction([
    prisma.siteImage.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    prisma.siteImage.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ]);

  refresh();
  return { ok: true as const };
}
