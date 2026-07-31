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
/**
 * Padding AND a floor on the height.
 *
 * Padding alone was not enough: these bands only wrap a heading and a line of
 * text, so a photo sitting behind them got squeezed into a strip you could not
 * read. A minimum height gives the photograph actual room regardless of how
 * little copy sits on top of it, and the padding keeps the text off the edges.
 *
 * Values are complete class strings rather than assembled at runtime, because
 * Tailwind scans source text and never sees a class built from variables.
 */
const CENTRE = "flex flex-col justify-center";

/**
 * Three steps, because a height that reads well on a phone is a letterbox on a
 * 1440px monitor. The desktop step is the one that matters here: these bands
 * are full-bleed, so the wider the screen the thinner a fixed height looks.
 */
const BAND_PADDING = {
  SHORT: `${CENTRE} py-12 sm:py-16 min-h-[15rem] sm:min-h-[18rem] lg:min-h-[22rem]`,
  MEDIUM: `${CENTRE} py-16 sm:py-24 min-h-[21rem] sm:min-h-[27rem] lg:min-h-[34rem]`,
  TALL: `${CENTRE} py-24 sm:py-36 min-h-[28rem] sm:min-h-[36rem] lg:min-h-[44rem]`,
} as const;

/**
 * Padding classes for a slot's band.
 *
 * An empty slot drops to SHORT regardless of what is stored. The height exists
 * to give a photograph room, so reserving 34rem for a slot with no photo just
 * produces a large empty black rectangle, which looks more broken than a thin
 * band does. As soon as a photo is uploaded the slot's own setting takes over.
 */
export async function bandPadding(slot: string): Promise<string> {
  const image = await getSiteImage(slot);
  if (!image) return BAND_PADDING.SHORT;
  return BAND_PADDING[image.bandHeight];
}
