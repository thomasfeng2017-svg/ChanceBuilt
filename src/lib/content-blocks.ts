/**
 * Every piece of copy the shop can edit, and its current wording.
 *
 * The `text` here is the DEFAULT, not a placeholder. Whatever is written below
 * is exactly what the site shows until someone edits it in the admin, so an
 * empty ContentBlock table renders the finished site rather than a skeleton.
 * That is what makes this safe to add to an already-live site.
 *
 * To make a new string editable: add an entry here, then read it on the page
 * with `copy("its.key")`. That is the whole job; the admin screen is generated
 * from this list.
 *
 * DELIBERATELY NOT HERE: nav labels, button microcopy, form labels, error
 * messages, and any fitment wording. Those are structural. Exposing them would
 * bury the fields the shop actually wants behind a hundred it never touches,
 * and inviting someone to reword "Add to cart" or a fitment warning creates
 * problems rather than solving them.
 *
 * Keys are `page.section.field` and must never be reused for different copy,
 * since an edit is stored against the key.
 */

export type ContentBlockDef = {
  key: string;
  /** Shown as the field label in the admin. */
  label: string;
  /** Written for the shop, not for a developer. */
  hint?: string;
  /** Renders a textarea rather than a single-line input. */
  multiline?: boolean;
  /** The live wording, and the fallback. */
  text: string;
};

export type ContentGroup = {
  title: string;
  blurb: string;
  blocks: ContentBlockDef[];
};

export const CONTENT_GROUPS: ContentGroup[] = [
  {
    title: "Homepage",
    blurb: "The first thing anyone reads. Keep the headline short: it is set very large.",
    blocks: [
      {
        key: "home.hero.eyebrow",
        label: "Small line above the headline",
        text: "Riverside, California · Turbocharged BMW only",
      },
      {
        key: "home.hero.headline",
        label: "Main headline",
        hint: "Two short lines work best. Long headlines wrap badly on a phone.",
        text: "BMW Performance\nSpecialists",
        multiline: true,
      },
      {
        key: "home.hero.subhead",
        label: "Paragraph under the headline",
        multiline: true,
        text: "S55, S58, B58, N54 and N55. Turbo upgrades, ECU unlocks and custom tuning, honest maintenance, and full race car builds, all done in-house.",
      },
      {
        key: "home.tuning.heading",
        label: "Tuning section heading",
        text: "We write the map.\nNot a reseller.",
        multiline: true,
      },
      {
        key: "home.tuning.body",
        label: "Tuning section paragraph",
        multiline: true,
        text: "Unlocks, flashing platforms and custom calibration on our own dyno. We log, adjust and re-log until the car is safe and making what it should on your fuel, then we hand you a sheet that proves it.",
      },
      {
        key: "home.services.heading",
        label: "Services section heading",
        text: "What we do best",
      },
      {
        key: "home.departments.heading",
        label: "Parts section heading",
        text: "Shop by department",
      },
      {
        key: "home.merch.heading",
        label: "Merch section heading",
        text: "Wear the shop",
      },
      {
        key: "home.merch.blurb",
        label: "Merch section line",
        text: "No car required. Ships with your parts if you order both.",
      },
    ],
  },
  {
    title: "Services page",
    blurb: "The intro, plus the one-line description under each category heading.",
    blocks: [
      {
        key: "services.intro",
        label: "Opening paragraph",
        multiline: true,
        text: "We work on turbocharged BMWs (S55, S58, B58, N54 and N55) from a stage 1 flash through to a full race car. Everything below can be booked online, and anything that needs a conversation first starts with a consultation.",
      },
      {
        key: "services.tuning.blurb",
        label: "Tuning & ECU",
        text: "Unlocks, flashing platforms and custom calibration. This is what the shop is built around.",
      },
      {
        key: "services.performance.blurb",
        label: "Performance installation",
        text: "Hardware fitted properly, then tuned to work together rather than fight each other.",
      },
      {
        key: "services.maintenance.blurb",
        label: "Maintenance",
        text: "The scheduled work that keeps a tuned BMW alive, plus the failure points we know about.",
      },
      {
        key: "services.diagnostic.blurb",
        label: "Diagnostics",
        text: "Proper diagnosis with BMW-specific tooling before anyone spends money on parts.",
      },
      {
        key: "services.fabrication.blurb",
        label: "Fabrication & builds",
        text: "One-off work, cages, custom pipework and full race car builds.",
      },
      {
        key: "services.platforms.blurb",
        label: "Platforms block",
        multiline: true,
        text: "We are not a general repair shop that also does BMWs. These are the engines we work on every day.",
      },
    ],
  },
  {
    title: "Parts & merch",
    blurb: "The banner text at the top of the two shop pages.",
    blocks: [
      { key: "parts.banner.heading", label: "Parts page heading", text: "Parts" },
      {
        key: "parts.banner.blurb",
        label: "Parts page line",
        text: "Everything we stock and fit, filtered to your exact chassis.",
      },
      { key: "merch.banner.heading", label: "Merch page heading", text: "Wear the shop" },
      {
        key: "merch.banner.blurb",
        label: "Merch page line",
        text: "Hoodies, tees, hats and stickers. No chassis code required.",
      },
    ],
  },
];

export const ALL_CONTENT_BLOCKS: ContentBlockDef[] = CONTENT_GROUPS.flatMap((g) => g.blocks);

/** Key to default text, for the fallback path. */
export const CONTENT_DEFAULTS: Record<string, string> = Object.fromEntries(
  ALL_CONTENT_BLOCKS.map((b) => [b.key, b.text]),
);

export function contentBlockDef(key: string): ContentBlockDef | undefined {
  return ALL_CONTENT_BLOCKS.find((b) => b.key === key);
}
