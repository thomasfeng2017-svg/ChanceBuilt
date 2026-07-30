import "server-only";
import { cache } from "react";
import { prisma } from "./db";
import { SITE as DEFAULTS, hoursLabel, type ShopHours, type SiteDetails } from "./site";

/**
 * Business details, read from the database with the code constants as a
 * fallback.
 *
 * Deliberately returns the SAME SHAPE as the old `SITE` constant, plus the two
 * derived exports that went with it. Call sites change one line:
 *
 *   -  import { SITE, HOURS_LABEL, addressLine } from "@/lib/site";
 *   +  const { SITE, HOURS_LABEL, addressLine } = await getShopSettings();
 *
 * Every `SITE.phone` and `SITE.hours[weekday]` below that keeps working
 * untouched, which is what makes migrating fourteen files a mechanical edit
 * rather than a rewrite.
 *
 * Wrapped in React's `cache`, so the header, footer and page body of a single
 * request share one query rather than issuing three.
 */

/**
 * A stored `hours` value is JSON, so it is `unknown` until proven otherwise.
 * Anything malformed falls back to the code defaults rather than throwing:
 * a bad row should not take the whole storefront down.
 */
function parseHours(value: unknown): ShopHours {
  if (!Array.isArray(value) || value.length !== 7) return DEFAULTS.hours;

  const out = value.map((day) => {
    if (day === null) return null;
    if (
      typeof day === "object" &&
      day !== null &&
      typeof (day as { open?: unknown }).open === "string" &&
      typeof (day as { close?: unknown }).close === "string"
    ) {
      return { open: (day as { open: string }).open, close: (day as { close: string }).close };
    }
    return null;
  });

  return out as ShopHours;
}

export type ShopSettingsView = {
  SITE: SiteDetails;
  HOURS_LABEL: Array<{ days: string; time: string }>;
  addressLine: string;
};

export const getShopSettings = cache(async (): Promise<ShopSettingsView> => {
  const row = await prisma.shopSettings.findFirst().catch(() => null);

  const SITE = row
    ? {
        ...DEFAULTS,
        name: row.name,
        shortName: row.shortName,
        legalName: row.legalName,
        tagline: row.tagline,
        description: row.description,
        phone: row.phone,
        // Derived, never stored: a stored copy would drift from the number.
        phoneHref: `tel:+1${row.phone.replace(/\D/g, "")}`,
        email: row.email,
        address: {
          ...DEFAULTS.address,
          street: row.street,
          city: row.city,
          state: row.state,
          zip: row.zip,
        },
        social: {
          instagram: row.instagram ?? DEFAULTS.social.instagram,
          youtube: row.youtube ?? DEFAULTS.social.youtube,
          tiktok: row.tiktok ?? DEFAULTS.social.tiktok,
          yelp: row.yelp ?? DEFAULTS.social.yelp,
          google: row.google ?? DEFAULTS.social.google,
        },
        hours: parseHours(row.hours),
      }
    : DEFAULTS;

  const HOURS_LABEL = hoursLabel(SITE.hours);

  const addressLine = `${SITE.address.street}, ${SITE.address.city}, ${SITE.address.state} ${SITE.address.zip}`;

  return { SITE, HOURS_LABEL, addressLine };
});

/** Closures that overlap today or later, soonest first. */
export const getUpcomingClosures = cache(async () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return prisma.shopClosure
    .findMany({ where: { endsOn: { gte: today } }, orderBy: { startsOn: "asc" } })
    .catch(() => []);
});

/**
 * Closure dates as a Set of "YYYY-MM-DD", which is the form the booking
 * calendar compares against. Ranges are expanded because they are short by
 * nature; a shop does not close for a year.
 */
export const getClosedDates = cache(async (): Promise<Set<string>> => {
  const closures = await getUpcomingClosures();
  const out = new Set<string>();

  for (const c of closures) {
    const cursor = new Date(c.startsOn);
    const end = new Date(c.endsOn);
    // Guard against an inverted or absurd range rather than looping forever.
    let guard = 0;
    while (cursor <= end && guard++ < 400) {
      out.add(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return out;
});
