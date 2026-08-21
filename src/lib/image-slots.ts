/**
 * The catalogue of image slots the site knows about.
 *
 * This drives the admin Photos screen, so adding a new slot here is all it
 * takes to make it manageable. Keep the hints written for the shop, not for a
 * developer: they are the only instructions anyone will read.
 */

export type SlotDef = {
  slot: string;
  label: string;
  hint: string;
  /** Roughly how it is displayed, so the admin can preview the right shape. */
  aspect: "wide" | "landscape" | "square" | "portrait";
};

export type SlotGroup = {
  title: string;
  blurb: string;
  slots: SlotDef[];
};

export const GALLERY_SLOT = "gallery";

/**
 * The wide banner behind the title on an engine's own page, derived from that
 * engine's tile slot.
 *
 * Derived rather than written out twice so the registry below and the page that
 * reads it cannot drift apart. The two are separate slots because one photo was
 * being asked to work as a small landscape tile on the homepage and as a
 * full-width banner on the engine page, and a crop that suits one rarely suits
 * the other. Empty falls back to the tile photo, so nothing breaks before
 * anyone gets round to shooting the wide version.
 */
export const engineBannerSlot = (tileSlot: string) => `${tileSlot}:banner`;

export const SLOT_GROUPS: SlotGroup[] = [
  {
    title: "Homepage",
    blurb: "The first things anyone sees.",
    slots: [
      {
        slot: "hero",
        label: "Hero background",
        hint: "Wide shot of the shop, sits behind the headline. Busy photos fight the text, so pick one with some empty space on the left.",
        aspect: "wide",
      },
      {
        slot: "section:home-cta",
        label: "Bottom call-to-action",
        hint: "Background for the 'Bring it in' block at the foot of the homepage.",
        aspect: "wide",
      },
    ],
  },
  {
    title: "Engine platforms",
    blurb:
      "The four tiles under Shop by engine. Tight shots of the engine bay work best. Leave one empty and it falls back to a technical drawing.",
    slots: [
      { slot: "engine:s55", label: "S55", hint: "F80 M3, F82 M4, F87 M2 Competition.", aspect: "landscape" },
      { slot: "engine:s58", label: "S58", hint: "G80 M3, G82 M4, G87 M2, X3M / X4M.", aspect: "landscape" },
      { slot: "engine:b58", label: "B58", hint: "M340i, M240i, M440i, Z4 M40i, A90 Supra.", aspect: "landscape" },
      { slot: "engine:n54-n55", label: "N54 / N55", hint: "335i, 135i, 335is, E9x / F3x.", aspect: "landscape" },
    ],
  },
  {
    title: "Engine pages",
    blurb:
      "The wide photo behind the title on each engine page, the one you land on from a tile above. Leave one empty and it uses that engine's tile photo instead, which is fine but is a small landscape shot stretched across a wide banner.",
    slots: [
      { slot: engineBannerSlot("engine:s55"), label: "S55 page banner", hint: "Wide shot behind the S55 title.", aspect: "wide" },
      { slot: engineBannerSlot("engine:s58"), label: "S58 page banner", hint: "Wide shot behind the S58 title.", aspect: "wide" },
      { slot: engineBannerSlot("engine:b58"), label: "B58 page banner", hint: "Wide shot behind the B58 title.", aspect: "wide" },
      { slot: engineBannerSlot("engine:n54-n55"), label: "N54 / N55 page banner", hint: "Wide shot behind the N54 / N55 title.", aspect: "wide" },
    ],
  },
  {
    title: "Services",
    blurb: "One photo per service category, shown next to each heading.",
    slots: [
      { slot: "section:services-header", label: "Services page banner", hint: "Wide shot behind the Services title.", aspect: "wide" },
      { slot: "section:service-tuning", label: "Tuning & ECU", hint: "Someone at the laptop, or the dyno.", aspect: "landscape" },
      { slot: "section:service-performance", label: "Performance install", hint: "Hardware going on a car.", aspect: "landscape" },
      { slot: "section:service-maintenance", label: "Maintenance", hint: "Car on the lift.", aspect: "landscape" },
      { slot: "section:service-diagnostic", label: "Diagnostics", hint: "Scanner or a car being looked over.", aspect: "landscape" },
      { slot: "section:service-fabrication", label: "Fabrication & builds", hint: "Custom work, cages, a race car.", aspect: "landscape" },
    ],
  },
  {
    title: "Other pages",
    blurb: "Photos used across the rest of the site.",
    slots: [
      { slot: "section:parts-banner", label: "Parts page banner", hint: "Wide shot behind the Parts title.", aspect: "wide" },
      { slot: "section:merch-banner", label: "Merch page banner", hint: "Wide shot behind the Merch title. Anything with the shop logo in it works well.", aspect: "wide" },
      { slot: "section:about-shop", label: "About: the shop", hint: "Inside the workshop.", aspect: "landscape" },
      { slot: "section:about-bays", label: "About: the bays", hint: "Cars on the lifts.", aspect: "landscape" },
      { slot: "section:contact-shop", label: "Contact page", hint: "Outside the unit, so people recognise it when they arrive.", aspect: "landscape" },
      { slot: "section:book-shop", label: "Booking page", hint: "Tall photo beside the location details.", aspect: "portrait" },
    ],
  },
];

export const ALL_SLOTS: SlotDef[] = SLOT_GROUPS.flatMap((g) => g.slots);

export function slotDef(slot: string): SlotDef | undefined {
  return ALL_SLOTS.find((s) => s.slot === slot);
}

/** Aspect ratio classes for admin previews. */
export const ASPECT_CLASS: Record<SlotDef["aspect"], string> = {
  wide: "aspect-[21/9]",
  landscape: "aspect-4/3",
  square: "aspect-square",
  portrait: "aspect-[3/4]",
};

/**
 * The same ratios as numbers. The focal picker needs these to draw the crop
 * region over the full photo, so the shop can see exactly what gets cut.
 */
export const ASPECT_RATIO: Record<SlotDef["aspect"], number> = {
  wide: 21 / 9,
  landscape: 4 / 3,
  square: 1,
  portrait: 3 / 4,
};
