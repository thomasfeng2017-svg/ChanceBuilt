/**
 * Default business details.
 *
 * These are no longer the live values. The shop edits its own details under
 * Settings in the admin, and `src/lib/settings.ts` reads them from the
 * database, falling back to everything here when no row exists yet. That
 * fallback is what keeps a fresh checkout and the seed working.
 *
 * Read through `getShopSettings()` rather than importing SITE directly, or the
 * page will show these constants instead of whatever the shop actually set.
 */

/** One entry per weekday, Sunday first. `null` means closed that day. */
export type ShopHours = Array<{ open: string; close: string } | null>;

export type SiteDetails = {
  name: string;
  shortName: string;
  legalName: string;
  tagline: string;
  description: string;
  phone: string;
  phoneHref: string;
  email: string;
  address: { street: string; city: string; state: string; zip: string };
  /**
   * Only Instagram was ever confirmed. Anything left empty is not rendered,
   * rather than shipping a link that 404s: a dead social icon in the footer
   * reads worse than an absent one. Fill these in as they are confirmed.
   */
  social: {
    instagram?: string;
    youtube?: string;
    tiktok?: string;
    yelp?: string;
    google?: string;
  };
  hours: ShopHours;
  platforms: ReadonlyArray<{
    code: string;
    codes: string[];
    slot: string;
    /** Drives the EngineGlyph schematic: single or twin turbo. */
    turbos: 1 | 2;
    blurb: string;
  }>;
};

export const SITE: SiteDetails = {
  name: "ChanceBuilt Performance",
  shortName: "ChanceBuilt",
  legalName: "ChanceBuilt Performance LLC",
  tagline: "BMW Performance Specialists",
  description:
    "BMW performance specialists in Riverside, California. Turbo upgrades, ECU unlocks and custom tuning, maintenance and full race car builds for S55, B58, S58 and N54/N55 platforms.",

  phone: "(951) 539-2901",
  phoneHref: "tel:+19515392901",
  // The one address customers are told to write to. Also the fallback for
  // SHOP_NOTIFICATION_EMAIL, so shop alerts land here if that env var is unset.
  email: "sales@chancebuiltperformance.com",

  address: {
    // Confirmed by the shop owner 2026-08-02. An earlier 12510 came from
    // third-party listings and was wrong.
    street: "12490 Magnolia Ave",
    city: "Riverside",
    state: "CA",
    zip: "92503",
  },

  social: {
    instagram: "https://www.instagram.com/chancebuiltllc/",
    // Unconfirmed: both @chancebuiltllc and @chancebuiltperformance 404.
    youtube: "",
    yelp: "https://www.yelp.com/biz/chancebuilt-performance-riverside",
    // Resolves to the Google Business listing for ChanceBuilt Performance LLC
    // (knowledge graph id /g/11m75qhpd_). Kept as the short share link rather
    // than the expanded search URL, which carries tracking parameters.
    google: "https://share.google/0iQV3XgDFgenKHfyl",
    tiktok: "https://www.tiktok.com/@chancebuiltperformance",
  },

  /**
   * Opening hours, 0 = Sunday. `null` means closed.
   * These drive the booking calendar — change them here and availability
   * follows automatically.
   */
  hours: [
    null, // Sun
    { open: "10:00", close: "18:00" }, // Mon
    { open: "10:00", close: "18:00" }, // Tue
    { open: "10:00", close: "18:00" }, // Wed
    { open: "10:00", close: "18:00" }, // Thu
    { open: "10:00", close: "18:00" }, // Fri
    { open: "11:00", close: "18:00" }, // Sat
  ] as Array<{ open: string; close: string } | null>,

  /**
   * Engine platforms the shop leads with.
   *
   * `codes` are matched against Model.engineCodes to filter the catalog, so
   * "N54 / N55" correctly covers both. `slot` is the SiteImage slot holding
   * that platform's photo, which the shop can change in the admin.
   */
  platforms: [
    {
      code: "S55",
      codes: ["S55"],
      slot: "engine:s55",
      turbos: 2 as const,
      blurb: "F80 M3 · F82 M4 · F87 M2 Competition",
    },
    {
      code: "S58",
      codes: ["S58"],
      slot: "engine:s58",
      turbos: 2 as const,
      blurb: "G80 M3 · G82 M4 · G87 M2 · X3M / X4M",
    },
    {
      code: "B58",
      codes: ["B58"],
      slot: "engine:b58",
      // Single twin-scroll, unlike the M engines.
      turbos: 1 as const,
      blurb: "M340i · M240i · M440i · Z4 M40i · A90 Supra",
    },
    {
      code: "N54 / N55",
      codes: ["N54", "N55"],
      slot: "engine:n54-n55",
      turbos: 2 as const,
      blurb: "335i · 135i · 335is · E9x / F3x",
    },
  ],
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Business week order, so the label reads Monday first and Sunday last. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "10:00" -> "10:00 AM", "18:00" -> "6:00 PM". */
function time12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/**
 * Human-readable opening hours, consecutive identical days merged.
 *
 * This used to be a hand-written constant sitting next to the `hours` array it
 * was supposed to describe, which meant the two could disagree and nothing
 * would catch it. Deriving it means the footer can never advertise hours the
 * booking calendar won't honour.
 */
export function hoursLabel(hours: ShopHours): Array<{ days: string; time: string }> {
  const out: Array<{ days: string; time: string }> = [];

  for (const weekday of WEEK_ORDER) {
    const day = hours[weekday];
    const time = day ? `${time12h(day.open)} - ${time12h(day.close)}` : "Closed";
    const last = out[out.length - 1];

    if (last && last.time === time) {
      // Extend the run. "Monday" becomes "Monday - Tuesday", then the end moves.
      const start = last.days.split(" - ")[0];
      last.days = `${start} - ${DAY_NAMES[weekday]}`;
    } else {
      out.push({ days: DAY_NAMES[weekday], time });
    }
  }

  return out;
}

export const HOURS_LABEL = hoursLabel(SITE.hours);

export const addressLine = `${SITE.address.street}, ${SITE.address.city}, ${SITE.address.state} ${SITE.address.zip}`;

/**
 * Where "Directions" goes: the shop's own Google listing, chosen by the client.
 *
 * This is the share link from the Maps app. It resolves to the
 * "ChanceBuilt Performance LLC" place page, so the customer lands on the
 * listing with the photos, hours, reviews and a Directions button, rather than
 * being thrown straight into turn-by-turn.
 *
 * Do not "improve" this into a coordinate link. Another business, Valenz Auto
 * Body, shares 12490 Magnolia Ave, so a lat/lng destination reverse-geocodes to
 * their name and tells the customer they are driving to the wrong shop. The
 * place id in the long URL does not fix that either: the Maps URLs API wants
 * the "ChIJ..." form and silently drops the "0x...:0x..." form that browser
 * URLs carry. Both were tried and checked against Google.
 */
export const directionsUrl = "https://maps.app.goo.gl/UkAJoKUZVMg4L1d47";

/**
 * The same listing addressed permanently rather than through a short link,
 * kept as the fallback if that link ever stops resolving. The cid is the
 * decimal form of the 0x61b1804b92ae05a3 in the listing URL.
 */
export const mapsListingUrl = "https://maps.google.com/?cid=7039548754628576675";
