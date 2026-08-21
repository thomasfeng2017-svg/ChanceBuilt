import type { ServiceCategory } from "@prisma/client";

/**
 * The service categories, in the order they appear on the site.
 *
 * One list, because there were five: the services page, the admin list, the
 * admin form, the booking form and the save action each kept their own copy of
 * the categories and their labels. Adding one meant finding all five, and
 * missing one meant a category that saved but never showed up, or showed up
 * with a raw enum name like SUSPENSION as its heading.
 *
 * Order is deliberate. Tuning and performance lead because that is what the
 * shop is known for and what the rest of the site promises, then the mechanical
 * work behind it.
 */
export type ServiceCategoryDef = {
  value: ServiceCategory;
  /** Section heading on the services page. */
  title: string;
  /** Shorter label for admin tables and the booking form, where space is tight. */
  short: string;
  /** Photo slot behind the section heading. */
  slot: string;
};

export const SERVICE_CATEGORIES: ServiceCategoryDef[] = [
  {
    value: "TUNING",
    title: "Custom Engine Calibrations",
    short: "Tuning",
    slot: "section:service-tuning",
  },
  {
    value: "PERFORMANCE",
    title: "Performance Upgrades",
    short: "Performance",
    slot: "section:service-performance",
  },
  {
    value: "SUSPENSION",
    title: "Suspension & Drivetrain",
    short: "Suspension",
    slot: "section:service-suspension",
  },
  {
    value: "BRAKES",
    title: "Brakes",
    short: "Brakes",
    slot: "section:service-brakes",
  },
  {
    value: "MAINTENANCE",
    title: "Maintenance",
    short: "Maintenance",
    slot: "section:service-maintenance",
  },
  {
    value: "DIAGNOSTIC",
    title: "Diagnostics",
    short: "Diagnostics",
    slot: "section:service-diagnostic",
  },
  {
    value: "FABRICATION",
    title: "Fabrication & Builds",
    short: "Fabrication",
    slot: "section:service-fabrication",
  },
];

export const SERVICE_CATEGORY_VALUES: ServiceCategory[] = SERVICE_CATEGORIES.map((c) => c.value);

export function serviceCategoryDef(value: string): ServiceCategoryDef | undefined {
  return SERVICE_CATEGORIES.find((c) => c.value === value);
}

/** The editable blurb under each category heading. */
export const serviceCategoryBlurbKey = (value: string) =>
  `services.${value.toLowerCase()}.blurb`;
