import "server-only";
import { prisma } from "./db";
import { listImages, captionFromPath } from "./media";
import { GALLERY_SLOT } from "./image-slots";

/**
 * Reading site photography.
 *
 * The database is the source of truth so the shop can manage its own images in
 * production. The `public/` folders remain a fallback, which keeps a fresh
 * checkout looking right before anyone has run `npm run images:import`, and
 * means a failed migration degrades to the old behaviour instead of a blank
 * site.
 */

export type SiteImageView = {
  url: string;
  alt: string;
  caption: string | null;
  /** Ready to drop into a CSS `object-position`. */
  objectPosition: string;
  isVideo: boolean;
  posterUrl: string | null;
  /** Intrinsic size, when recorded. Null for older rows and the file fallback. */
  width: number | null;
  height: number | null;
  /** "cover" crops to fill; "contain" shows the whole photo. */
  objectFit: "cover" | "contain";
  /** Zoom as a multiplier, ready for a CSS transform. 1 = no zoom. */
  scale: number;
  /** Vertical room for banner slots. */
  bandHeight: "SHORT" | "MEDIUM" | "TALL";
};

/** Which public/ folder backs a slot, for the fallback path. */
function fallbackFolder(slot: string): string | null {
  if (slot === "hero") return "hero";
  if (slot === GALLERY_SLOT) return "gallery";
  if (slot.startsWith("engine:")) return "engines";
  if (slot.startsWith("section:")) return "sections";
  return null;
}

function fallbackStem(slot: string): string | null {
  const colon = slot.indexOf(":");
  return colon === -1 ? null : slot.slice(colon + 1);
}

const toView = (row: {
  url: string;
  alt: string;
  caption: string | null;
  focalX: number;
  focalY: number;
  kind?: "IMAGE" | "VIDEO";
  posterUrl?: string | null;
  width?: number | null;
  height?: number | null;
  fit?: "COVER" | "CONTAIN";
  zoom?: number;
  bandHeight?: "SHORT" | "MEDIUM" | "TALL";
}): SiteImageView => ({
  url: row.url,
  alt: row.alt,
  caption: row.caption,
  objectPosition: `${row.focalX}% ${row.focalY}%`,
  isVideo: row.kind === "VIDEO",
  posterUrl: row.posterUrl ?? null,
  width: row.width ?? null,
  height: row.height ?? null,
  objectFit: row.fit === "CONTAIN" ? "contain" : "cover",
  // Clamped here rather than trusted: a bad row should not be able to blow a
  // photo up to 50x and cover the page with one pixel.
  scale: Math.min(3, Math.max(1, (row.zoom ?? 100) / 100)),
  bandHeight: row.bandHeight ?? "MEDIUM",
});

/** One image for a single-image slot, or null. */
export async function getSiteImage(slot: string): Promise<SiteImageView | null> {
  const row = await prisma.siteImage.findFirst({
    where: { slot, active: true },
    orderBy: { sortOrder: "asc" },
  });
  if (row) return toView(row);

  // Fallback: the file that used to back this slot.
  const folder = fallbackFolder(slot);
  if (!folder) return null;

  const files = await listImages(folder);
  if (files.length === 0) return null;

  if (slot === "hero") {
    return { url: files[0], alt: "", caption: null, objectPosition: "50% 50%", isVideo: false, posterUrl: null, width: null, height: null, objectFit: "cover" as const, scale: 1, bandHeight: "MEDIUM" as const };
  }

  const stem = fallbackStem(slot);
  const match = files.find((f) => {
    const name = (f.split("/").pop() ?? "").replace(/\.[^.]+$/, "");
    return name === stem;
  });
  return match ? { url: match, alt: "", caption: null, objectPosition: "50% 50%", isVideo: false, posterUrl: null, width: null, height: null, objectFit: "cover" as const, scale: 1, bandHeight: "MEDIUM" as const } : null;
}

/** All images for a multi-image slot, in display order. */
export async function getSiteImages(slot: string): Promise<SiteImageView[]> {
  const rows = await prisma.siteImage.findMany({
    where: { slot, active: true },
    orderBy: { sortOrder: "asc" },
  });
  if (rows.length > 0) return rows.map(toView);

  const folder = fallbackFolder(slot);
  if (!folder) return [];

  return (await listImages(folder)).map((url) => ({
    url,
    alt: captionFromPath(url),
    caption: captionFromPath(url),
    objectPosition: "50% 50%",
    isVideo: false,
    posterUrl: null,
    width: null,
    height: null,
    objectFit: "cover" as const,
    scale: 1,
    bandHeight: "MEDIUM" as const,
  }));
}

/** Everything for a slot including hidden rows. For the admin. */
export async function getSlotRows(slot: string) {
  return prisma.siteImage.findMany({
    where: { slot },
    orderBy: { sortOrder: "asc" },
  });
}
