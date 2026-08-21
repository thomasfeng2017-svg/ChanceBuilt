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
    blurb: "The headings, the intro, and the one-line description under each category.",
    blocks: [
      { key: "services.eyebrow", label: "Small line above the heading", text: "What we do" },
      { key: "services.heading", label: "Heading", text: "Services" },
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
        key: "services.platforms.eyebrow",
        label: "Small line above the platforms heading",
        text: "The engines",
      },
      {
        key: "services.platforms.heading",
        label: "Platforms heading",
        text: "Platforms we know inside out",
      },
      {
        key: "services.platforms.blurb",
        label: "Platforms paragraph",
        multiline: true,
        text: "We are not a general repair shop that also does BMWs. These are the engines we work on every day.",
      },
    ],
  },
  {
    title: "About page",
    blurb: "The three paragraphs that explain what the shop is.",
    blocks: [
      { key: "about.eyebrow", label: "Small line above the heading", text: "Who we are" },
      {
        key: "about.heading",
        label: "Heading",
        hint: "Two short lines work best.",
        multiline: true,
        text: "We only work on\nturbo BMWs",
      },
      {
        key: "about.para1",
        label: "First paragraph",
        multiline: true,
        text: "ChanceBuilt Performance is a BMW specialist shop in Riverside, California. Not a general repair shop that happens to take BMWs, but a shop that works on the same handful of engines every single day and knows exactly how they fail, how they respond to boost, and what they need to survive it.",
      },
      {
        key: "about.para2",
        label: "Second paragraph",
        multiline: true,
        text: "That focus is the whole point. When an S55 comes in with a misfire under load, we are not guessing. When someone wants 700 wheel horsepower out of a B58, we can tell them what that actually costs: in parts, in fuelling, and in how long the car lasts afterwards.",
      },
      {
        key: "about.para3",
        label: "Third paragraph",
        multiline: true,
        text: "We do the tuning in-house. We do the fabrication in-house. And we would rather talk you out of a bad idea than take your money for it.",
      },
    ],
  },
  {
    title: "Contact page",
    blurb: "What people read before they call.",
    blocks: [
      { key: "contact.eyebrow", label: "Small line above the heading", text: "Get in touch" },
      { key: "contact.heading", label: "Heading", text: "Contact" },
      {
        key: "contact.intro",
        label: "Opening paragraph",
        hint: "Write a link as [the words](/where-it-goes). Internal pages start with a slash.",
        multiline: true,
        text: "The fastest way to get on the calendar is to [book online](/book). For anything else, call the shop, we answer.",
      },
      {
        key: "contact.cta.heading",
        label: "Heading on the box at the bottom",
        text: "Ready to get the car in?",
      },
    ],
  },
  {
    title: "Booking page",
    blurb: "Shown above the calendar.",
    blocks: [
      { key: "book.heading", label: "Heading", text: "Book the shop" },
      {
        key: "book.intro",
        label: "Opening paragraph",
        hint: "The phone number is added automatically at the end.",
        multiline: true,
        text: "Pick what you need, choose a time that works, and we'll confirm before you come in. Not sure what you need? Call us on",
      },
    ],
  },
  {
    title: "Gallery page",
    blurb: "The intro, and the box at the bottom.",
    blocks: [
      { key: "gallery.eyebrow", label: "Small line above the heading", text: "Our work" },
      { key: "gallery.heading", label: "Heading", text: "Gallery" },
      {
        key: "gallery.intro",
        label: "Opening paragraph",
        hint: "Write a link as [the words](/where-it-goes), or a full https:// address.",
        multiline: true,
        text: "Builds, installs and race cars out of the shop. More on [Instagram](https://www.instagram.com/chancebuiltllc/).",
      },
      {
        key: "gallery.cta.heading",
        label: "Heading on the box at the bottom",
        text: "Want your car in here?",
      },
      {
        key: "gallery.cta.body",
        label: "Line under it",
        text: "Book a slot and let's talk about what you want out of it.",
      },
    ],
  },
  {
    title: "Homepage: bottom block",
    blurb: "The 'Bring it in' block at the foot of the homepage.",
    blocks: [
      { key: "home.cta.heading", label: "Heading", text: "Bring it in" },
      {
        key: "home.cta.body",
        label: "Paragraph",
        multiline: true,
        text: "Tell us what the car is and what you want out of it. We'll tell you honestly what it takes, what it costs, and how long it will be with us.",
      },
    ],
  },
  {
    title: "Parts & merch",
    blurb: "The banner text at the top of the two shop pages.",
    blocks: [
      { key: "parts.banner.eyebrow", label: "Parts small line", text: "The catalog" },
      { key: "parts.banner.heading", label: "Parts page heading", text: "Parts" },
      {
        key: "parts.banner.blurb",
        label: "Parts page line",
        text: "Everything we stock and fit, filtered to your exact chassis.",
      },
      { key: "merch.banner.eyebrow", label: "Merch small line", text: "Shop merch" },
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
