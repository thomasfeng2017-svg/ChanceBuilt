import { getSiteImage } from "./site-images";

/**
 * Vertical padding for a banner band, chosen by the shop per slot.
 *
 * Height lives with the photo rather than in the page, because it is a
 * property of that photo's framing: a vertical shot needs a taller band to
 * survive the crop, and the person who can see that is whoever is looking at
 * the photo in the admin.
 *
 * Values are complete class strings rather than assembled from parts, because
 * Tailwind scans source text and would not emit a class built at runtime.
 */
const BAND_PADDING = {
  SHORT: "py-10 sm:py-14",
  MEDIUM: "py-14 sm:py-20",
  TALL: "py-20 sm:py-32",
} as const;

/**
 * Padding classes for a slot's band. Falls back to MEDIUM when the slot is
 * empty, so a page with no photo yet still has sensible proportions.
 */
export async function bandPadding(slot: string): Promise<string> {
  const image = await getSiteImage(slot);
  return BAND_PADDING[image?.bandHeight ?? "MEDIUM"];
}
