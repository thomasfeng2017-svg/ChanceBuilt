/**
 * Seed script — ChanceBuilt Performance.
 *
 *   npm run db:seed
 *
 * Vehicle data is BMW-first and organised by chassis code, because that is how
 * BMW owners actually shop ("F80", "G80", "F30 335i"). A handful of non-BMW
 * platforms that share BMW engines (the A90 Supra runs a B58) are included too.
 *
 * The catalog here is representative placeholder inventory using the brands a
 * turbo-BMW shop genuinely stocks. Prices and stock are illustrative — replace
 * with real inventory, or import fitment in bulk via scripts/import-fitment.ts.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CURRENT_YEAR = 2026;

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ---------------------------------------------------------------- vehicles --

type ModelSpec = {
  name: string;
  chassis?: string;
  engines: string[];
  yearStart: number;
  yearEnd: number;
};

const VEHICLES: Record<string, ModelSpec[]> = {
  BMW: [
    // --- M cars ---
    { name: "M3", chassis: "E46", engines: ["S54"], yearStart: 2001, yearEnd: 2006 },
    { name: "M3", chassis: "E90", engines: ["S65"], yearStart: 2008, yearEnd: 2011 },
    { name: "M3", chassis: "E92", engines: ["S65"], yearStart: 2008, yearEnd: 2013 },
    { name: "M3", chassis: "F80", engines: ["S55"], yearStart: 2015, yearEnd: 2018 },
    { name: "M3", chassis: "G80", engines: ["S58"], yearStart: 2021, yearEnd: CURRENT_YEAR },
    { name: "M4", chassis: "F82", engines: ["S55"], yearStart: 2015, yearEnd: 2020 },
    { name: "M4", chassis: "G82", engines: ["S58"], yearStart: 2021, yearEnd: CURRENT_YEAR },
    // The M2 and M2 Competition share the F87 shell but are different engines.
    // Listing them as one chassis with both codes made S55 parts show up in an
    // N55 search, so they are separate models.
    { name: "M2", chassis: "F87", engines: ["N55"], yearStart: 2016, yearEnd: 2018 },
    {
      name: "M2 Competition",
      chassis: "F87",
      engines: ["S55"],
      yearStart: 2019,
      yearEnd: 2021,
    },
    { name: "M2", chassis: "G87", engines: ["S58"], yearStart: 2023, yearEnd: CURRENT_YEAR },
    { name: "M5", chassis: "F90", engines: ["S63"], yearStart: 2018, yearEnd: 2024 },
    { name: "M5", chassis: "F10", engines: ["S63"], yearStart: 2012, yearEnd: 2016 },
    { name: "X3 M", chassis: "F97", engines: ["S58"], yearStart: 2020, yearEnd: CURRENT_YEAR },
    { name: "X4 M", chassis: "F98", engines: ["S58"], yearStart: 2020, yearEnd: CURRENT_YEAR },

    // --- 3 Series ---
    { name: "3 Series", chassis: "E90", engines: ["N52", "N54", "N55"], yearStart: 2006, yearEnd: 2011 },
    { name: "3 Series", chassis: "E92", engines: ["N54", "N55"], yearStart: 2007, yearEnd: 2013 },
    { name: "3 Series", chassis: "F30", engines: ["N20", "N26", "N55", "B58"], yearStart: 2012, yearEnd: 2019 },
    { name: "3 Series", chassis: "G20", engines: ["B46", "B48", "B58"], yearStart: 2019, yearEnd: CURRENT_YEAR },

    // --- 2 / 4 Series ---
    { name: "2 Series", chassis: "F22", engines: ["N20", "N55", "B58"], yearStart: 2014, yearEnd: 2021 },
    { name: "2 Series", chassis: "G42", engines: ["B48", "B58"], yearStart: 2022, yearEnd: CURRENT_YEAR },
    { name: "4 Series", chassis: "F32", engines: ["N20", "N55", "B58"], yearStart: 2014, yearEnd: 2020 },
    { name: "4 Series", chassis: "G22", engines: ["B48", "B58"], yearStart: 2021, yearEnd: CURRENT_YEAR },

    // --- 1 / 5 / Z / X ---
    { name: "1 Series", chassis: "E82", engines: ["N54", "N55"], yearStart: 2008, yearEnd: 2013 },
    { name: "5 Series", chassis: "F10", engines: ["N55", "N63"], yearStart: 2011, yearEnd: 2016 },
    { name: "5 Series", chassis: "G30", engines: ["B48", "B58", "N63"], yearStart: 2017, yearEnd: 2023 },
    { name: "Z4", chassis: "G29", engines: ["B48", "B58"], yearStart: 2019, yearEnd: CURRENT_YEAR },
    { name: "X3", chassis: "G01", engines: ["B46", "B48", "B58"], yearStart: 2018, yearEnd: CURRENT_YEAR },
    { name: "X5", chassis: "G05", engines: ["B58", "N63"], yearStart: 2019, yearEnd: CURRENT_YEAR },
  ],

  // Shares the B58 with BMW — a genuine cross-platform fit for most B58 parts.
  Toyota: [
    { name: "GR Supra", chassis: "A90", engines: ["B58", "B48"], yearStart: 2020, yearEnd: CURRENT_YEAR },
  ],
};

// -------------------------------------------------------------- categories --

// `kind` decides which storefront a department appears in. Children inherit it
// from their parent, so a category can never end up half in each shop.
const CATEGORIES: Array<{ name: string; children: string[]; kind?: "PART" | "MERCH" }> = [
  { name: "Tuning", children: ["ECU Tunes & Licenses", "Flash Tools", "Methanol & Water Injection"] },
  { name: "Turbo", children: ["Turbo Upgrade Kits", "Turbo Inlets", "Blow-Off & Diverter Valves"] },
  { name: "Charge Cooling", children: ["Intercoolers", "Charge Pipes", "Heat Exchangers"] },
  { name: "Intake", children: ["Intake Systems", "Air Filters"] },
  { name: "Exhaust", children: ["Downpipes", "Mid Pipes", "Cat-Back Systems"] },
  { name: "Fueling", children: ["Port Injection", "Fuel Pumps", "Injectors"] },
  { name: "Cooling", children: ["Radiators", "Oil Coolers", "Thermostats"] },
  { name: "Drivetrain", children: ["DCT & Transmission", "Clutches & Flywheels", "Differential"] },
  { name: "Suspension", children: ["Coilovers", "Sway Bars", "Bushings & Mounts"] },
  { name: "Brakes", children: ["Big Brake Kits", "Brake Pads", "Brake Lines & Fluid"] },
  { name: "Maintenance", children: ["Oil & Filters", "Spark Plugs", "Service Kits"] },
  { name: "Apparel", children: ["Shirts & Hoodies", "Hats & Stickers"], kind: "MERCH" },
];

const BRANDS = [
  "Pure Turbos",
  "MHD",
  "bootmod3",
  "CSF",
  "Wagner Tuning",
  "VRSF",
  "Burger Motorsports",
  "Eventuri",
  "aFe Power",
  "Akrapovic",
  "KW Suspension",
  "Bilstein",
  "Brembo",
  "StopTech",
  "Fuel-It",
  "Spool Performance",
  "Motul",
  "Liqui Moly",
  "NGK",
  "Turner Motorsport",
  "ChanceBuilt",
];

// ---------------------------------------------------------------- products --

/** Fitment expressed against `${makeSlug}/${modelSlug}` keys. */
type Fit = [
  makeSlug: string,
  modelSlug: string,
  yearStart: number,
  yearEnd: number,
  extra?: { submodel?: string; engine?: string; notes?: string },
];

type ProductSpec = {
  name: string;
  category: string;
  brand: string;
  price: number;
  compareAt?: number;
  description: string;
  stock?: number;
  universal?: boolean;
  fits?: Fit[];
  /** Paths under public/. First is the main shot. */
  images?: string[];
};

// Platform shorthands. Model slugs are `${name}-${chassis}` lowercased.
const F80 = ["bmw", "m3-f80"] as const;
const F82 = ["bmw", "m4-f82"] as const;
const F87 = ["bmw", "m2-f87"] as const;
/** M2 Competition: same shell, S55 engine. */
const F87C = ["bmw", "m2-competition-f87"] as const;
const G80 = ["bmw", "m3-g80"] as const;
const G82 = ["bmw", "m4-g82"] as const;
const G87 = ["bmw", "m2-g87"] as const;
const F97 = ["bmw", "x3-m-f97"] as const;
const F98 = ["bmw", "x4-m-f98"] as const;
const F30 = ["bmw", "3-series-f30"] as const;
const G20 = ["bmw", "3-series-g20"] as const;
const F22 = ["bmw", "2-series-f22"] as const;
const G42 = ["bmw", "2-series-g42"] as const;
const F32 = ["bmw", "4-series-f32"] as const;
const G22 = ["bmw", "4-series-g22"] as const;
const E90 = ["bmw", "3-series-e90"] as const;
const E92 = ["bmw", "3-series-e92"] as const;
const E82 = ["bmw", "1-series-e82"] as const;
const F10_5 = ["bmw", "5-series-f10"] as const;
const G30 = ["bmw", "5-series-g30"] as const;
const G29 = ["bmw", "z4-g29"] as const;
const G01 = ["bmw", "x3-g01"] as const;
const G05 = ["bmw", "x5-g05"] as const;
const F90 = ["bmw", "m5-f90"] as const;
const A90 = ["toyota", "gr-supra-a90"] as const;

/** Build a fitment row for a platform over a year range. */
const f = (
  p: readonly [string, string],
  yearStart: number,
  yearEnd: number,
  extra?: Fit[4],
): Fit => [p[0], p[1], yearStart, yearEnd, extra];

// Convenience: the full production run of each platform.
const S55_CARS = (extra?: Fit[4]): Fit[] => [
  f(F80, 2015, 2018, extra),
  f(F82, 2015, 2020, extra),
  f(F87C, 2019, 2021, extra),
];

const S58_CARS = (extra?: Fit[4]): Fit[] => [
  f(G80, 2021, CURRENT_YEAR, extra),
  f(G82, 2021, CURRENT_YEAR, extra),
  f(G87, 2023, CURRENT_YEAR, extra),
  f(F97, 2020, CURRENT_YEAR, extra),
  f(F98, 2020, CURRENT_YEAR, extra),
];

const B58_CARS = (extra?: Fit[4]): Fit[] => [
  f(F30, 2016, 2019, { ...extra, submodel: "340i" }),
  f(G20, 2019, CURRENT_YEAR, { ...extra, submodel: "M340i" }),
  f(F22, 2016, 2021, { ...extra, submodel: "M240i" }),
  f(G42, 2022, CURRENT_YEAR, { ...extra, submodel: "M240i" }),
  f(F32, 2016, 2020, { ...extra, submodel: "440i" }),
  f(G22, 2021, CURRENT_YEAR, { ...extra, submodel: "M440i" }),
  f(G29, 2019, CURRENT_YEAR, { ...extra, submodel: "M40i" }),
  f(G30, 2017, 2023, { ...extra, submodel: "540i" }),
  f(G01, 2018, CURRENT_YEAR, { ...extra, submodel: "X3 M40i" }),
  f(G05, 2019, CURRENT_YEAR, { ...extra, submodel: "X5 40i" }),
  f(A90, 2020, CURRENT_YEAR, { ...extra, submodel: "3.0" }),
];

/** S63 V8 M cars — F10 M5 and F90 M5. */
const S63_CARS = (extra?: Fit[4]): Fit[] => [
  f(F90, 2018, 2024, extra),
  f(["bmw", "m5-f10"], 2012, 2016, extra),
  f(F10_5, 2011, 2016, { ...extra, submodel: "550i" }),
];

const N54_N55_CARS = (extra?: Fit[4]): Fit[] => [
  f(E90, 2007, 2011, { ...extra, submodel: "335i" }),
  f(E92, 2007, 2013, { ...extra, submodel: "335i / 335is" }),
  f(E82, 2008, 2013, { ...extra, submodel: "135i" }),
  f(F30, 2012, 2015, { ...extra, submodel: "335i" }),
];

const PRODUCTS: ProductSpec[] = [
  // ------------------------------------------------------------- tuning ---
  {
    name: "bootmod3 Flash Tune - S55",
    category: "ECU Tunes & Licenses",
    brand: "bootmod3",
    price: 795,
    stock: 999,
    description:
      "Full custom flash tuning platform for the S55. Includes the bootmod3 license, OTS maps and support for custom map delivery from our tuner. Requires a compatible flash interface.",
    fits: S55_CARS(),
  },
  {
    name: "bootmod3 Flash Tune - S58",
    category: "ECU Tunes & Licenses",
    brand: "bootmod3",
    price: 895,
    stock: 999,
    description:
      "S58 flash tuning license with OTS and custom map support. Covers G8x M cars and the F97/F98 X models.",
    fits: S58_CARS(),
  },
  {
    name: "MHD Flash Tune License - B58",
    category: "ECU Tunes & Licenses",
    brand: "MHD",
    price: 549,
    stock: 999,
    description:
      "MHD wireless flashing licence for B58 cars. Stage maps, datalogging and full custom map support through our shop.",
    fits: B58_CARS(),
  },
  {
    name: "MHD Flash Tune License - N54/N55",
    category: "ECU Tunes & Licenses",
    brand: "MHD",
    price: 399,
    stock: 999,
    description:
      "The long-standing flashing platform for N54 and N55 cars. Backend flashing, logging and map switching from your phone.",
    fits: N54_N55_CARS(),
  },
  {
    name: "ChanceBuilt Custom Dyno Tune - Remote Map Pack",
    category: "ECU Tunes & Licenses",
    brand: "ChanceBuilt",
    price: 649,
    stock: 999,
    description:
      "Custom map development from your datalogs by our in-house tuner. Includes revision rounds until the car is where you want it. Book dyno time separately if you want it dialled in on our rollers.",
    fits: [...S55_CARS(), ...S58_CARS(), ...B58_CARS()],
  },
  {
    name: "bootmod3 Flash Interface Cable",
    category: "Flash Tools",
    brand: "bootmod3",
    price: 129,
    stock: 40,
    universal: true,
    description:
      "ENET/OBD flashing interface. Required for first-time bootmod3 installation on most chassis.",
  },
  {
    name: "Methanol Injection Kit - Stage 2",
    category: "Methanol & Water Injection",
    brand: "Burger Motorsports",
    price: 899,
    compareAt: 999,
    stock: 8,
    description:
      "Progressive water/methanol injection with a boost-referenced controller, pump, tank and nozzles. Requires a supporting tune. Do not run meth on a stock map.",
    fits: [...S55_CARS(), ...N54_N55_CARS(), ...B58_CARS()],
  },

  // -------------------------------------------------------------- turbo ---
  {
    name: "Pure Turbos Stage 2 Upgrade - S55",
    category: "Turbo Upgrade Kits",
    brand: "Pure Turbos",
    price: 3499,
    stock: 4,
    description:
      "Drop-in billet-wheel turbo upgrade for the S55. Retains factory manifolds and packaging while supporting substantially more airflow than stock. Supporting fuel and a custom tune are required. Core exchange applies.",
    images: ["/products/pure-turbos-s55.webp"],
    fits: S55_CARS({ notes: "Core exchange required" }),
  },
  {
    name: "Pure Turbos Stage 2 Upgrade - S58",
    category: "Turbo Upgrade Kits",
    brand: "Pure Turbos",
    price: 3899,
    stock: 3,
    description:
      "Billet compressor upgrade for the S58 built on the factory frames. Direct fit with no manifold or downpipe changes. Requires port injection or E85 and a custom tune.",
    images: ["/products/pure-turbos-s58.webp"],
    fits: S58_CARS({ notes: "Core exchange required" }),
  },
  {
    name: "Pure Turbos Stage 1 Upgrade - B58",
    category: "Turbo Upgrade Kits",
    brand: "Pure Turbos",
    price: 2299,
    stock: 5,
    description:
      "Single-turbo upgrade for the B58 that keeps stock spool character while raising the airflow ceiling. Pairs well with an upgraded intercooler and port injection.",
    images: ["/products/turbo-hardware.webp"],
    fits: B58_CARS({ notes: "Core exchange required" }),
  },
  {
    name: "Spool FX-350 Turbo Kit - N54",
    category: "Turbo Upgrade Kits",
    brand: "Spool Performance",
    price: 4295,
    stock: 2,
    description:
      "Bolt-on twin turbo upgrade for the N54 with billet wheels and upgraded bearings. Includes lines and hardware. Built for E85 and a proper custom tune.",
    images: ["/products/pure-turbos-s55.webp"],
    fits: [
      f(E90, 2007, 2011, { submodel: "335i", engine: "N54" }),
      f(E92, 2007, 2010, { submodel: "335i", engine: "N54" }),
      f(E82, 2008, 2010, { submodel: "135i", engine: "N54" }),
    ],
  },
  {
    name: "Turbo Inlet Pipe Set - S55",
    category: "Turbo Inlets",
    brand: "VRSF",
    price: 349,
    stock: 14,
    description:
      "Smooth-bore silicone inlets that remove the restrictive factory inlet necks. A genuine restriction on any S55 running more than stock boost.",
    images: ["/products/chancebuilt-turbo-inlet-s55.webp"],
    fits: S55_CARS(),
  },
  {
    name: "Turbo Inlet - B58 Single Piece",
    category: "Turbo Inlets",
    brand: "Eventuri",
    price: 429,
    stock: 11,
    description:
      "Carbon fibre one-piece turbo inlet with a smooth internal transition. Replaces the restrictive stock inlet on B58 cars.",
    fits: B58_CARS(),
  },

  // ------------------------------------------------------ charge cooling ---
  {
    name: "CSF Race Intercooler - S55",
    category: "Intercoolers",
    brand: "CSF",
    price: 1249,
    compareAt: 1349,
    stock: 7,
    description:
      "High-density bar-and-plate core sized for sustained pulls and track use. A meaningful reduction in intake air temperatures over the factory unit on any tuned S55.",
    images: ["/products/csf-intercooler-s55.webp", "/products/csf-intercooler-s55-2.webp"],
    fits: S55_CARS(),
  },
  {
    name: "CSF Race Intercooler - S58",
    category: "Intercoolers",
    brand: "CSF",
    price: 1399,
    stock: 6,
    description:
      "Direct-fit stepped-core intercooler for the S58. Keeps charge temps under control on stage 2 and turbo-upgraded cars.",
    fits: S58_CARS(),
  },
  {
    name: "Wagner Tuning Competition Intercooler - B58",
    category: "Intercoolers",
    brand: "Wagner Tuning",
    price: 1099,
    stock: 9,
    description:
      "Bar-and-plate competition core with cast end tanks. Bolts to factory mounting points with no trimming on most B58 chassis.",
    images: ["/products/wagner-intercooler-b58.webp"],
    fits: B58_CARS(),
  },
  {
    name: "VRSF Charge Pipe Kit - N54/N55",
    category: "Charge Pipes",
    brand: "VRSF",
    price: 289,
    stock: 22,
    description:
      "Aluminium replacement for the notorious plastic factory charge pipe. If you are running any meaningful boost on an N54 or N55, the stock pipe is a matter of when, not if.",
    fits: N54_N55_CARS(),
  },
  {
    name: "Aluminium Charge Pipe - S55",
    category: "Charge Pipes",
    brand: "VRSF",
    price: 319,
    stock: 16,
    description:
      "Mandrel-bent aluminium charge pipe with a machined BOV flange. Removes a known failure point on boosted S55 cars.",
    fits: S55_CARS(),
  },
  {
    name: "CSF Heat Exchanger - S58",
    category: "Heat Exchangers",
    brand: "CSF",
    price: 949,
    stock: 5,
    description:
      "Upgraded low-temperature radiator for the S58 charge cooling circuit. The single best thing you can do for repeat-pull consistency.",
    fits: S58_CARS(),
  },

  // ------------------------------------------------------------- intake ---
  {
    name: "Eventuri Carbon Intake System - S55",
    category: "Intake Systems",
    brand: "Eventuri",
    price: 1595,
    stock: 6,
    description:
      "Carbon fibre intake with the signature venturi housings and a sealed airbox drawing from the factory ducting. Genuine airflow gain, and it sounds the part.",
    images: ["/products/eventuri-intake-s55.webp"],
    fits: S55_CARS(),
  },
  {
    name: "Eventuri Carbon Intake System - S58",
    category: "Intake Systems",
    brand: "Eventuri",
    price: 1795,
    stock: 4,
    description:
      "Full carbon intake for the S58 with sealed airboxes and cone filters. Direct fit to the factory mounting points.",
    fits: S58_CARS(),
  },
  {
    name: "aFe Momentum Cold Air Intake - B58",
    category: "Intake Systems",
    brand: "aFe Power",
    price: 549,
    stock: 13,
    description:
      "Sealed intake system with a large conical filter and moulded housing. A good-value step up from the factory airbox on B58 cars.",
    fits: B58_CARS(),
  },
  {
    name: "Drop-In Performance Filter - S55/S58",
    category: "Air Filters",
    brand: "aFe Power",
    price: 129,
    stock: 34,
    description:
      "Washable oiled panel filters that drop straight into the factory airboxes. The easiest maintenance-interval upgrade there is.",
    fits: [...S55_CARS(), ...S58_CARS()],
  },

  // ------------------------------------------------------------ exhaust ---
  {
    name: "Catless Downpipes - S55",
    category: "Downpipes",
    brand: "VRSF",
    price: 749,
    stock: 10,
    description:
      "Stainless catless downpipes for the S55. Off-road and competition use only. These are not legal for street use in California. Requires a supporting tune to avoid fault codes.",
    images: ["/products/exhaust-under-car.webp"],
    fits: S55_CARS({ notes: "Off-road / competition use only" }),
  },
  {
    name: "Catted Downpipe - B58",
    category: "Downpipes",
    brand: "VRSF",
    price: 649,
    stock: 12,
    description:
      "200-cell high-flow catted downpipe. Retains a catalyst while removing most of the factory restriction. Still requires a tune to avoid a check engine light.",
    images: ["/products/exhaust-piping-laid-out.webp"],
    fits: B58_CARS(),
  },
  {
    name: "Akrapovic Slip-On Titanium Exhaust - G8x",
    category: "Cat-Back Systems",
    brand: "Akrapovic",
    price: 4899,
    stock: 2,
    description:
      "Titanium slip-on system with carbon tips. Substantial weight saving over the factory exhaust and a considerably better noise. Valve control retained.",
    images: ["/products/exhaust-under-car.webp"],
    fits: [f(G80, 2021, CURRENT_YEAR), f(G82, 2021, CURRENT_YEAR)],
  },
  {
    name: "Resonated Mid Pipe - S55",
    category: "Mid Pipes",
    brand: "VRSF",
    price: 549,
    stock: 8,
    description:
      "Stainless resonated mid pipe that opens the car up without turning the cabin into a drone chamber on the freeway.",
    images: ["/products/exhaust-piping-laid-out.webp"],
    fits: S55_CARS(),
  },

  // ------------------------------------------------------------ fueling ---
  {
    name: "Fuel-It Stage 2 Port Injection Kit - S55",
    category: "Port Injection",
    brand: "Fuel-It",
    price: 1349,
    stock: 5,
    description:
      "Port injection kit with controller, rails, injectors and wiring. The standard answer to running out of direct-injection fuelling on a turbo-upgraded S55.",
    fits: S55_CARS({ notes: "Tune required" }),
  },
  {
    name: "Fuel-It Port Injection Kit - B58",
    category: "Port Injection",
    brand: "Fuel-It",
    price: 1249,
    stock: 6,
    description:
      "Bolt-on port injection for B58 cars running E85 blends or upgraded turbos. Includes a boost-referenced controller.",
    fits: B58_CARS({ notes: "Tune required" }),
  },
  {
    name: "Fuel-It Bucketless LPFP Upgrade - S55/S58",
    category: "Fuel Pumps",
    brand: "Fuel-It",
    price: 899,
    stock: 7,
    description:
      "Low-pressure fuel pump upgrade to support higher ethanol content and elevated fuel demand. Required on most stage 2+ builds.",
    fits: [...S55_CARS(), ...S58_CARS()],
  },

  // ------------------------------------------------------------ cooling ---
  {
    name: "CSF Triple-Pass Radiator - S55",
    category: "Radiators",
    brand: "CSF",
    price: 1199,
    stock: 4,
    description:
      "All-aluminium triple-pass radiator for track-driven S55 cars. Direct fit with factory mounting and fan shroud.",
    fits: S55_CARS(),
  },
  {
    name: "Oil Cooler Upgrade Kit - S58",
    category: "Oil Coolers",
    brand: "CSF",
    price: 1099,
    stock: 3,
    description:
      "Larger-capacity engine oil cooler for sustained track sessions. Keeps oil temperature in a sensible window on hot days.",
    fits: S58_CARS(),
  },
  {
    name: "Low-Temp Thermostat - N54/N55",
    category: "Thermostats",
    brand: "Turner Motorsport",
    price: 149,
    stock: 18,
    description:
      "Opens earlier than the factory thermostat to keep coolant temperatures down on boosted cars. Pairs with a tune that takes advantage of it.",
    fits: N54_N55_CARS(),
  },

  // --------------------------------------------------------- drivetrain ---
  {
    name: "DCT Service Kit - S55 / F8x",
    category: "DCT & Transmission",
    brand: "Turner Motorsport",
    price: 429,
    stock: 15,
    description:
      "Complete DCT fluid and filter service kit including the correct fluid volume, filter and pan gasket. Due every 40,000 miles, sooner on a tuned or tracked car.",
    fits: [f(F80, 2015, 2018), f(F82, 2015, 2020), f(F87, 2016, 2018), f(F87C, 2019, 2021)],
  },
  {
    name: "Clutch & Flywheel Kit - Stage 3",
    category: "Clutches & Flywheels",
    brand: "Turner Motorsport",
    price: 2199,
    stock: 2,
    description:
      "Multi-disc clutch and lightweight flywheel for high-torque manual builds. Expect a firmer pedal and a much higher holding capacity.",
    images: ["/products/clutch-flywheel-kit.webp"],
    fits: [f(E92, 2008, 2013, { submodel: "335i / M3" }), f(F80, 2015, 2018, { submodel: "Manual only" })],
  },
  {
    name: "Differential Bushing Insert Kit",
    category: "Differential",
    brand: "Turner Motorsport",
    price: 189,
    stock: 20,
    description:
      "Polyurethane inserts that take the slop out of the factory diff mounts without transmitting the whole drivetrain into the cabin.",
    fits: [...S55_CARS(), ...N54_N55_CARS()],
  },

  // --------------------------------------------------------- suspension ---
  {
    name: "KW Variant 3 Coilover Kit - F8x",
    category: "Coilovers",
    brand: "KW Suspension",
    price: 3299,
    stock: 3,
    description:
      "Independently adjustable compression and rebound damping with stainless bodies. The reference street-and-track coilover for the F8x platform. Alignment required after fitting.",
    fits: [f(F80, 2015, 2018), f(F82, 2015, 2020)],
  },
  {
    name: "KW Variant 3 Coilover Kit - G8x",
    category: "Coilovers",
    brand: "KW Suspension",
    price: 3599,
    stock: 2,
    description:
      "V3 coilovers for the G8x chassis with electronic damper cancellation included. Alignment and corner balance strongly recommended.",
    fits: [f(G80, 2021, CURRENT_YEAR), f(G82, 2021, CURRENT_YEAR)],
  },
  {
    name: "Bilstein B16 Coilover Kit - B58 Chassis",
    category: "Coilovers",
    brand: "Bilstein",
    price: 2199,
    stock: 4,
    description:
      "Height and damping adjustable monotube kit for B58 chassis. A well-judged street ride height drop without ruining the daily commute.",
    fits: B58_CARS(),
  },
  {
    name: "Adjustable Rear Sway Bar - F8x/G8x",
    category: "Sway Bars",
    brand: "Turner Motorsport",
    price: 469,
    stock: 9,
    description:
      "Three-position hollow rear bar with spherical end links. Dials rotation into the car without needing spring rate changes.",
    fits: [...S55_CARS(), f(G80, 2021, CURRENT_YEAR), f(G82, 2021, CURRENT_YEAR)],
  },
  {
    name: "Solid Subframe Bushing Set",
    category: "Bushings & Mounts",
    brand: "Turner Motorsport",
    price: 349,
    stock: 11,
    description:
      "Aluminium subframe bushings that eliminate rear subframe deflection under load. A track-focused part, so expect additional noise and vibration on the street.",
    fits: [...S55_CARS(), ...N54_N55_CARS()],
  },

  // ------------------------------------------------------------- brakes ---
  {
    name: "Brembo GT 6-Piston Big Brake Kit - Front",
    category: "Big Brake Kits",
    brand: "Brembo",
    price: 5299,
    stock: 2,
    description:
      "Two-piece slotted rotors, forged six-piston calipers, lines and pads. Real stopping power for track work. Verify wheel clearance before ordering.",
    fits: [...S55_CARS(), ...S58_CARS()],
  },
  {
    name: "StopTech Street Performance Pads - Front",
    category: "Brake Pads",
    brand: "StopTech",
    price: 249,
    stock: 24,
    description:
      "Higher-friction street pad with sensible dust and noise behaviour. A good match for a fast street car that sees the occasional canyon run.",
    fits: [...S55_CARS(), ...B58_CARS(), ...N54_N55_CARS()],
  },
  {
    name: "Stainless Brake Line Set",
    category: "Brake Lines & Fluid",
    brand: "StopTech",
    price: 189,
    stock: 26,
    description:
      "PTFE-lined stainless braided lines with DOT-compliant fittings. Firms up the pedal noticeably, especially once the fluid gets hot.",
    fits: [...S55_CARS(), ...S58_CARS(), ...B58_CARS(), ...N54_N55_CARS()],
  },
  {
    name: "Motul RBF 660 Racing Brake Fluid - 500ml",
    category: "Brake Lines & Fluid",
    brand: "Motul",
    price: 29,
    stock: 80,
    universal: true,
    description:
      "Very high dry boiling point racing fluid for track use. Hygroscopic, so flush it at least annually, more often if you track the car.",
  },

  // -------------------------------------------------------- maintenance ---
  {
    name: "Liqui Moly 5W-30 Oil Service Kit - S55/S58",
    category: "Oil & Filters",
    brand: "Liqui Moly",
    price: 189,
    stock: 30,
    description:
      "Full oil service in a box: the correct volume of BMW-approved synthetic, an OE filter and the drain plug crush washer.",
    fits: [...S55_CARS(), ...S58_CARS()],
  },
  {
    name: "Liqui Moly Molygen 5W-40 - 5 Litre",
    category: "Oil & Filters",
    brand: "Liqui Moly",
    price: 79,
    stock: 120,
    universal: true,
    description:
      "Full synthetic 5W-40. A common choice for tuned turbo cars running higher cylinder pressures. Confirm the correct grade for your engine first.",
  },
  {
    name: "NGK One-Step-Colder Spark Plug Set",
    category: "Spark Plugs",
    brand: "NGK",
    price: 119,
    stock: 45,
    description:
      "One heat range colder than factory, which is what you want once boost and timing go up. Gap them down for high-boost applications.",
    images: ["/products/ngk-spark-plugs.webp"],
    fits: [...S55_CARS(), ...B58_CARS(), ...N54_N55_CARS()],
  },
  {
    name: "Cooling System Service Kit - N54/N55",
    category: "Service Kits",
    brand: "Turner Motorsport",
    price: 549,
    stock: 8,
    description:
      "Water pump, thermostat, expansion tank, hoses and coolant. These fail on schedule on N54/N55 cars. Replace them before they strand you.",
    fits: N54_N55_CARS(),
  },
  {
    name: "Charge Pipe & Diverter Valve Service Kit",
    category: "Service Kits",
    brand: "Burger Motorsports",
    price: 329,
    stock: 12,
    description:
      "Replacement diverter valves and a reinforced charge pipe in one kit. Common maintenance on high-mileage N54/N55 cars.",
    fits: N54_N55_CARS(),
  },

  // ---------------------------------------------------------- S63 / V8 ---
  {
    name: "Catless Downpipes - S63 V8",
    category: "Downpipes",
    brand: "VRSF",
    price: 1249,
    stock: 4,
    description:
      "Stainless catless downpipes for the S63 twin-turbo V8. Off-road and competition use only. Not legal for street use in California. Requires a supporting tune.",
    fits: S63_CARS({ notes: "Off-road / competition use only" }),
  },
  {
    name: "MHD Flash Tune License - S63",
    category: "ECU Tunes & Licenses",
    brand: "MHD",
    price: 649,
    stock: 999,
    description:
      "Flashing licence for S63 cars including OTS maps and full custom map support through the shop.",
    fits: S63_CARS(),
  },
  {
    name: "CSF Charge Cooler Radiator - S63",
    category: "Heat Exchangers",
    brand: "CSF",
    price: 1149,
    stock: 3,
    description:
      "Upgraded charge cooling radiator for the S63. The factory unit heat-soaks quickly once the car is tuned. This keeps consecutive pulls consistent.",
    fits: S63_CARS(),
  },

  // ------------------------------------------------------------ apparel ---
  {
    name: "ChanceBuilt Shop Hoodie - Black",
    category: "Shirts & Hoodies",
    brand: "ChanceBuilt",
    price: 69,
    stock: 60,
    description: "Heavyweight cotton-blend hoodie with the shop logo. Runs true to size.",
  },
  {
    name: "ChanceBuilt Tee - Black",
    category: "Shirts & Hoodies",
    brand: "ChanceBuilt",
    price: 34,
    stock: 90,
    description: "Soft cotton tee with a small chest logo and a back print.",
  },
  {
    name: "ChanceBuilt Snapback Hat",
    category: "Hats & Stickers",
    brand: "ChanceBuilt",
    price: 39,
    stock: 55,
    description: "Flat-brim snapback with an embroidered logo. One size, adjustable.",
  },
  {
    name: "ChanceBuilt Sticker Pack",
    category: "Hats & Stickers",
    brand: "ChanceBuilt",
    price: 12,
    stock: 200,
    description: "Five weatherproof die-cut vinyl stickers. Toolbox, window or helmet.",
  },
];

// ---------------------------------------------------------------- services --

type ServiceSpec = {
  name: string;
  blurb: string;
  description: string;
  category: "TUNING" | "PERFORMANCE" | "MAINTENANCE" | "FABRICATION" | "DIAGNOSTIC";
  priceFrom?: number;
  priceNote?: string;
  durationMinutes: number;
  requiresVehicle?: boolean;
  sortOrder: number;
};

const SERVICES: ServiceSpec[] = [
  {
    name: "Custom Dyno Tune",
    blurb: "In-house tuning on our dyno, dialled in for your setup and fuel.",
    description:
      "Full custom calibration on the dyno. We log, adjust and re-log until the car is safe and making what it should on your fuel of choice. Includes before/after pulls and a printed sheet. Bring the car with at least a quarter tank of the fuel you intend to run.",
    category: "TUNING",
    priceFrom: 899,
    priceNote: "from, depending on platform",
    durationMinutes: 240,
    sortOrder: 1,
  },
  {
    name: "ECU Unlock & Flash",
    blurb: "Unlock a locked ECU and get flashing enabled on your chassis.",
    description:
      "Bench or OBD unlock for locked BMW ECUs, followed by installation of your chosen flashing platform (bootmod3 or MHD) and a base map. Required before any custom tuning on most 2018+ cars.",
    category: "TUNING",
    priceFrom: 499,
    durationMinutes: 180,
    sortOrder: 2,
  },
  {
    name: "Remote Tuning Session",
    blurb: "Custom maps developed from your datalogs, with no shop visit needed.",
    description:
      "Send us logs, we send you maps. Suited to customers outside Southern California or anyone who would rather not leave the car. Includes revision rounds until you are happy with how it drives.",
    category: "TUNING",
    priceFrom: 649,
    durationMinutes: 60,
    requiresVehicle: true,
    sortOrder: 3,
  },
  {
    name: "Stage 1 / Stage 2 Bolt-On Install",
    blurb: "Downpipes, intakes, charge pipes and intercoolers fitted properly.",
    description:
      "Installation of bolt-on performance hardware with a supporting tune. Price depends on the parts involved, so send us your list and we will quote the labour before you book.",
    category: "PERFORMANCE",
    priceFrom: 450,
    priceNote: "labour, from",
    durationMinutes: 300,
    sortOrder: 4,
  },
  {
    name: "Turbo Upgrade Install",
    blurb: "Upgraded turbos fitted, fuelled and tuned as one job.",
    description:
      "Full turbo upgrade installation including supporting fuelling, hardware and a custom calibration once it is together. Multi-day job. The booking slot is your drop-off appointment.",
    category: "PERFORMANCE",
    priceNote: "Quote after consultation",
    durationMinutes: 60,
    sortOrder: 5,
  },
  {
    name: "Suspension Install & Corner Balance",
    blurb: "Coilovers fitted, ride height set, corner balanced and aligned.",
    description:
      "Coilover or spring installation followed by a proper corner balance and performance alignment on our scales. Bring the car with about half a tank and tell us your intended use: street, canyon or track.",
    category: "PERFORMANCE",
    priceFrom: 700,
    durationMinutes: 300,
    sortOrder: 6,
  },
  {
    name: "DCT Service",
    blurb: "Fluid, filter and adaptation reset for F8x DCT gearboxes.",
    description:
      "Complete DCT fluid and filter service using the correct BMW-spec fluid, followed by a clutch adaptation reset. Due every 40,000 miles, and sooner on a tuned or tracked car.",
    category: "MAINTENANCE",
    priceFrom: 650,
    durationMinutes: 180,
    sortOrder: 7,
  },
  {
    name: "Oil Service",
    blurb: "BMW-approved synthetic, OE filter, and a look over the car.",
    description:
      "Full synthetic oil service with an OE filter and crush washer, plus a general inspection while it is on the lift. We will tell you what we see, without trying to sell you a job you do not need.",
    category: "MAINTENANCE",
    priceFrom: 180,
    durationMinutes: 60,
    sortOrder: 8,
  },
  {
    name: "Spark Plugs & Ignition Service",
    blurb: "Plugs and coils, the first thing to fix on a tuned car that stumbles.",
    description:
      "Spark plug replacement gapped for your power level, with coil inspection and replacement if needed. If your car is misfiring under boost, start here.",
    category: "MAINTENANCE",
    priceFrom: 320,
    durationMinutes: 90,
    sortOrder: 9,
  },
  {
    name: "Cooling System Overhaul",
    blurb: "Water pump, thermostat, tank and hoses before they leave you stranded.",
    description:
      "Preventative replacement of the known cooling failure points on N54, N55 and S55 cars. Far cheaper than the tow and the head gasket that can follow an overheat.",
    category: "MAINTENANCE",
    priceNote: "Quote by chassis",
    durationMinutes: 300,
    sortOrder: 10,
  },
  {
    name: "Diagnostic & Fault Code Scan",
    blurb: "Proper diagnosis with BMW-specific tooling, not a parts-cannon.",
    description:
      "Full-system scan with BMW-specific diagnostic software, live data where relevant, and a written explanation of what we found. The fee is credited against the repair if you go ahead with us.",
    category: "DIAGNOSTIC",
    priceFrom: 150,
    durationMinutes: 60,
    sortOrder: 11,
  },
  {
    name: "Pre-Purchase Inspection",
    blurb: "Before you buy someone else's project, let us look at it.",
    description:
      "Comprehensive inspection focused on the things that matter on a turbo BMW: coding history, tune traces, cooling system condition, leaks, and drivetrain wear. You get a written report with photos.",
    category: "DIAGNOSTIC",
    priceFrom: 250,
    durationMinutes: 90,
    sortOrder: 12,
  },
  {
    name: "Race Car Build Consultation",
    blurb: "Sit down with us and plan the whole build properly.",
    description:
      "An hour with the shop to scope a full build: class rules, power target, budget, timeline and parts strategy. We will tell you honestly what is realistic. The consultation fee is credited against the build if you proceed.",
    category: "FABRICATION",
    priceNote: "Credited against the build",
    durationMinutes: 60,
    requiresVehicle: false,
    sortOrder: 13,
  },
  {
    name: "Custom Fabrication",
    blurb: "One-off pipework, mounts, cages and whatever the build needs.",
    description:
      "In-house fabrication for parts that do not exist off the shelf. Bring the problem and we will work out the solution. Booking this slot starts with a look at the car and a scope discussion.",
    category: "FABRICATION",
    priceNote: "Quote after consultation",
    durationMinutes: 60,
    sortOrder: 14,
  },
];

// -------------------------------------------------------------------- main --

/**
 * This script DELETES every product, order and appointment before reseeding.
 * That is fine locally and catastrophic in production, so refuse to run against
 * anything that isn't obviously a local database unless explicitly overridden.
 */
function assertSafeTarget() {
  const url = process.env.DATABASE_URL ?? "";
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);

  if (isLocal || process.env.ALLOW_REMOTE_SEED === "1") return;

  const host = url.replace(/^[^@]*@/, "").split(/[/?]/)[0] || "(unset)";
  console.error(
    `\nRefusing to seed: DATABASE_URL points at "${host}", which is not localhost.\n` +
      `This script deletes all products, orders and appointments first.\n\n` +
      `If you really mean to seed a remote database (first-run setup only),\n` +
      `re-run with ALLOW_REMOTE_SEED=1.\n`,
  );
  process.exit(1);
}

async function main() {
  assertSafeTarget();

  console.log("Clearing existing data...");
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.fitment.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.model.deleteMany();
  await prisma.make.deleteMany();

  // Vehicles
  console.log("Seeding vehicles...");
  const modelIds = new Map<string, string>();
  const makeIds = new Map<string, string>();

  for (const [makeName, models] of Object.entries(VEHICLES)) {
    const makeSlug = slugify(makeName);
    const make = await prisma.make.create({ data: { name: makeName, slug: makeSlug } });
    makeIds.set(makeSlug, make.id);

    for (const m of models) {
      // Chassis code is part of the slug so "M3 (F80)" and "M3 (G80)" coexist.
      const modelSlug = slugify(m.chassis ? `${m.name}-${m.chassis}` : m.name);
      const model = await prisma.model.create({
        data: {
          makeId: make.id,
          name: m.name,
          slug: modelSlug,
          chassis: m.chassis ?? null,
          engineCodes: m.engines,
          yearStart: m.yearStart,
          yearEnd: m.yearEnd,
        },
      });
      modelIds.set(`${makeSlug}/${modelSlug}`, model.id);
    }
  }

  // Categories
  console.log("Seeding categories...");
  const categoryIds = new Map<string, string>();
  for (const { name, children, kind = "PART" } of CATEGORIES) {
    const parent = await prisma.category.create({
      data: { name, slug: slugify(name), kind },
    });
    categoryIds.set(name, parent.id);
    for (const child of children) {
      const c = await prisma.category.create({
        data: { name: child, slug: slugify(child), kind, parentId: parent.id },
      });
      categoryIds.set(child, c.id);
    }
  }

  // Brands
  console.log("Seeding brands...");
  const brandIds = new Map<string, string>();
  for (const name of BRANDS) {
    const b = await prisma.brand.create({ data: { name, slug: slugify(name) } });
    brandIds.set(name, b.id);
  }

  // Products + fitment
  console.log("Seeding products and fitment...");
  let skuCounter = 1000;
  let fitmentCount = 0;

  for (const spec of PRODUCTS) {
    const categoryId = categoryIds.get(spec.category);
    const brandId = brandIds.get(spec.brand);
    if (!categoryId) throw new Error(`Unknown category: ${spec.category}`);
    if (!brandId) throw new Error(`Unknown brand: ${spec.brand}`);

    const sku = `CB-${++skuCounter}`;
    const product = await prisma.product.create({
      data: {
        sku,
        partNumber: `${spec.brand.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 4)}-${skuCounter}`,
        name: spec.name,
        slug: `${slugify(spec.name)}-${sku.toLowerCase()}`,
        description: spec.description,
        priceCents: Math.round(spec.price * 100),
        compareAtCents: spec.compareAt ? Math.round(spec.compareAt * 100) : null,
        stock: spec.stock ?? 10,
        images: spec.images ?? [],
        isUniversal: spec.universal ?? false,
        brandId,
        categoryId,
      },
    });

    // De-duplicate fitment rows — the platform helpers can overlap when a
    // product lists both S55 and S58 groups.
    const seen = new Set<string>();
    for (const [makeSlug, modelSlug, yearStart, yearEnd, extra] of spec.fits ?? []) {
      const key = `${makeSlug}/${modelSlug}/${yearStart}/${yearEnd}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const makeId = makeIds.get(makeSlug);
      const modelId = modelIds.get(`${makeSlug}/${modelSlug}`);
      if (!makeId || !modelId) {
        throw new Error(`Unknown vehicle in fitment for ${spec.name}: ${makeSlug}/${modelSlug}`);
      }
      await prisma.fitment.create({
        data: {
          productId: product.id,
          makeId,
          modelId,
          yearStart,
          yearEnd,
          submodel: extra?.submodel ?? null,
          engine: extra?.engine ?? null,
          notes: extra?.notes ?? null,
        },
      });
      fitmentCount++;
    }
  }

  // Services
  console.log("Seeding services...");
  for (const s of SERVICES) {
    await prisma.service.create({
      data: {
        name: s.name,
        slug: slugify(s.name),
        blurb: s.blurb,
        description: s.description,
        category: s.category,
        priceFromCents: s.priceFrom ? Math.round(s.priceFrom * 100) : null,
        priceNote: s.priceNote ?? null,
        durationMinutes: s.durationMinutes,
        requiresVehicle: s.requiresVehicle ?? true,
        sortOrder: s.sortOrder,
      },
    });
  }

  console.log(
    `\nDone.\n  ${makeIds.size} makes\n  ${modelIds.size} models\n  ${categoryIds.size} categories\n  ${brandIds.size} brands\n  ${PRODUCTS.length} products\n  ${fitmentCount} fitment rows\n  ${SERVICES.length} services`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
