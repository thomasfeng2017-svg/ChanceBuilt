/**
 * Replace the placeholder catalog with ChanceBuilt's own product line.
 *
 * The 53 parts currently on the site were researched stand-ins (Brembo, KW,
 * CSF and so on) that the shop does not actually stock. They are ARCHIVED
 * rather than deleted: archived products vanish from the storefront but stay
 * attached to any order that referenced them, so nothing breaks retroactively.
 * The four ChanceBuilt merch items are left alone; they are the shop's own and
 * already have photography.
 *
 * Fitment is generated from the platform column each product sat under in the
 * inventory PDF. Two rules:
 *
 *   engine  - every chassis whose engineCodes include it, over that chassis's
 *             own production years. Right for S55/S58/N55/B46, where the part
 *             fits the engine rather than one body.
 *   chassis - a named chassis, optionally narrowed to a year window. Needed for
 *             the B58, where gen 1/2/3 are mechanically different engines
 *             sharing one code, so "all B58" would put a gen 1 downpipe on a
 *             2026 car.
 *
 * Run with no flag to preview, --apply to write:
 *   npx tsx --conditions=react-server scripts/import-chancebuilt-inventory.ts
 *   npx tsx --conditions=react-server scripts/import-chancebuilt-inventory.ts --apply
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type Fit =
  | { by: "engine"; code: string }
  | { by: "chassis"; chassis: string; from?: number; to?: number; engine?: string };

type Item = {
  name: string;
  price: number | null;
  category: string; // category slug
  brand?: string; // defaults to ChanceBuilt
  description: string;
  fits: Fit[];
  /** Kept out of the shop until the shop fills in what is missing. */
  hold?: string;
};

/*
  B58 generations, from the vendor documentation and corroborated by Chance's
  own product names ("gen 1 ... for f3x", "Gen 2 ... for g20").

    gen 1  B58B30M0   2016+   F22 M240i, F30 340i, F32 440i
    gen 2  B58TU      2019+   G20, G22, G29, G42, G01, A90 Supra
    gen 3  B58TU2     2023+   G05 X5 first, G20/G22 LCI from 2025

  Gen 3 is deliberately thin: the vehicle list does not yet carry G60, G70, G45
  or the LCI facelifts, and inventing fitment is worse than under-claiming it.
*/
const B58_GEN1: Fit[] = [
  { by: "chassis", chassis: "F22", from: 2016 },
  { by: "chassis", chassis: "F30", from: 2016 },
  { by: "chassis", chassis: "F32", from: 2017 },
];
const B58_GEN2: Fit[] = [
  { by: "chassis", chassis: "G20", from: 2019, to: 2024 },
  { by: "chassis", chassis: "G22", from: 2021, to: 2024 },
  { by: "chassis", chassis: "G29" },
  { by: "chassis", chassis: "G42" },
  { by: "chassis", chassis: "G01", from: 2019 },
  { by: "chassis", chassis: "A90" },
];
const B58_GEN3: Fit[] = [{ by: "chassis", chassis: "G05", from: 2023 }];

/** X3M and X4M share the S58 platform; every vendor sells one part for both. */
const X3M: Fit[] = [
  { by: "chassis", chassis: "F97" },
  { by: "chassis", chassis: "F98" },
];

const S58: Fit[] = [{ by: "engine", code: "S58" }];
const S55: Fit[] = [{ by: "engine", code: "S55" }];

const ITEMS: Item[] = [
  // ------------------------------------------------------------- G8x (S58) --
  { name: "G80 / G82 Midpipe", price: 650, category: "mid-pipes", fits: S58,
    description: "Midpipe for the S58 G8x cars. Pairs with our downpipes for a full exhaust path." },
  { name: "G8x Front Mount Intakes", price: 400, category: "intake-systems", fits: S58,
    description: "Front mount intake set for S58 G8x. Moves the inlet out of the engine bay for cooler air." },
  { name: "G8x Skid Plate", price: 200, category: "skid-plates", fits: S58,
    description: "Underbody skid plate for the G8x. Protects the sump and front subframe on lowered cars." },
  { name: "G8x Downpipes", price: 350, category: "downpipes", fits: S58,
    description: "Downpipe set for the S58 G8x. Off-road and competition use." },
  { name: "G87 Single Midpipe", price: 650, category: "mid-pipes", fits: [{ by: "chassis", chassis: "G87" }],
    description: "Single midpipe for the G87 M2." },
  { name: "G8x Intakes", price: 350, category: "intake-systems", fits: S58,
    description: "Stock location intake set for the S58 G8x.",
    hold: "Listed only as 'regular intakes' under the G8x column. Confirm the platform." },

  // ------------------------------------------------------------------ X3M --
  { name: "X3M / X4M Front Mount Intakes", price: 400, category: "intake-systems", fits: X3M,
    description: "Front mount intakes for the F97 X3 M and F98 X4 M." },
  { name: "X3M / X4M Skid Plates", price: 200, category: "skid-plates", fits: X3M,
    description: "Underbody protection for the F97 X3 M and F98 X4 M." },
  { name: "X3M / X4M Downpipes", price: 400, category: "downpipes", fits: X3M,
    description: "Downpipe set for the S58 X3 M and X4 M. Off-road and competition use." },
  { name: "X3M / X4M Single Midpipe", price: 650, category: "mid-pipes", fits: X3M,
    description: "Single midpipe for the F97 X3 M and F98 X4 M." },

  // ------------------------------------------------------------------ N55 --
  { name: "N55 E-Chassis Downpipes", price: 260, category: "downpipes",
    fits: [{ by: "chassis", chassis: "E82" }, { by: "chassis", chassis: "E90", engine: "N55" }, { by: "chassis", chassis: "E92", engine: "N55" }],
    description: "Downpipes for the N55 E-chassis cars. Off-road and competition use." },
  { name: "N55 F3x Intakes", price: 200, category: "intake-systems",
    fits: [{ by: "chassis", chassis: "F30" }, { by: "chassis", chassis: "F32" }],
    description: "Intake set for N55 F3x cars." },
  { name: "N55 F3x EWG Downpipe", price: 250, category: "downpipes",
    fits: [{ by: "chassis", chassis: "F30" }, { by: "chassis", chassis: "F32" }],
    description: "Electronic wastegate downpipe for N55 F3x. Off-road and competition use." },
  { name: "N55 F10 EWG Downpipe", price: 300, category: "downpipes", fits: [{ by: "chassis", chassis: "F10", engine: "N55" }],
    description: "Electronic wastegate downpipe for the N55 F10. Off-road and competition use." },
  { name: "N55 F10 PWG Downpipe", price: 300, category: "downpipes", fits: [{ by: "chassis", chassis: "F10", engine: "N55" }],
    description: "Pneumatic wastegate downpipe for the N55 F10. Off-road and competition use." },
  { name: "F10 535i Intake", price: 250, category: "intake-systems", fits: [{ by: "chassis", chassis: "F10", engine: "N55" }],
    description: "Intake for the F10 535i." },

  // ------------------------------------------------------------------ S55 --
  { name: "S55 Downpipes", price: 350, category: "downpipes", fits: S55,
    description: "Downpipe set for the S55 F8x cars. Off-road and competition use." },
  { name: "S55 Intakes", price: 270, category: "intake-systems", fits: S55,
    description: "Intake set for S55 F80 M3, F82 M4 and F87 M2 Competition." },
  { name: "S55 Chargepipes + J-Pipe", price: 350, category: "charge-pipes", fits: S55,
    description: "Chargepipe and J-pipe set for the S55. Replaces the plastic factory pipes." },
  { name: "S55 Single Midpipe", price: 600, category: "mid-pipes", fits: S55,
    description: "Single midpipe for the S55 F8x cars.",
    hold: "Listed only as 'single midpipe' under the S55 column. Confirm the platform." },

  // ------------------------------------------------------------ B58 gen 1 --
  { name: "B58 Gen 1 5-Inch Downpipe", price: 380, category: "downpipes", fits: B58_GEN1,
    description: "5 inch downpipe for the gen 1 B58. Off-road and competition use." },
  { name: "B58 Gen 1 Chargepipe", price: 220, category: "charge-pipes", fits: B58_GEN1,
    description: "Chargepipe for the gen 1 B58." },
  { name: "B58 Gen 1 F3x Intakes", price: 275, category: "intake-systems",
    fits: [{ by: "chassis", chassis: "F30", from: 2016 }, { by: "chassis", chassis: "F32", from: 2017 }],
    description: "Intake set for the gen 1 B58 in F3x cars." },
  { name: "B58 Gen 1 4.5-Inch Downpipe", price: 300, category: "downpipes", fits: B58_GEN1,
    description: "4 1/2 inch downpipe for the gen 1 B58. Off-road and competition use." },

  // ------------------------------------------------------------ B58 gen 2 --
  { name: "B58 Gen 2 Chargepipe", price: 220, category: "charge-pipes", fits: B58_GEN2,
    description: "Chargepipe for the gen 2 B58 (B58TU)." },
  { name: "B58 Gen 2 G20 Front Mount Intake", price: 350, category: "intake-systems",
    fits: [{ by: "chassis", chassis: "G20", from: 2019, to: 2024 }],
    description: "Front mount intake for the gen 2 B58 G20." },
  { name: "B58 Gen 2 Stock Location Intake", price: 300, category: "intake-systems", fits: B58_GEN2,
    description: "Stock location intake for the gen 2 B58." },

  // ------------------------------------------------------------ B58 gen 3 --
  { name: "B58 Gen 3 Downpipe", price: 400, category: "downpipes", fits: B58_GEN3,
    description: "Downpipe for the gen 3 B58 (B58TU2). Off-road and competition use.",
    hold: "Gen 3 fitment is limited to the G05 X5 in the current vehicle list. Confirm which cars this is sold for." },

  // ------------------------------------------------------------------ B46 --
  { name: "B46 Downpipes", price: null, category: "downpipes", fits: [{ by: "engine", code: "B46" }],
    description: "Downpipes for the B46. Off-road and competition use.",
    hold: "Price was cut off the inventory list." },

  // ---------------------------------------------------------- suspension --
  { name: "H&R Sport Lowering Springs", price: null, category: "lowering-springs", brand: "H&R",
    fits: [{ by: "chassis", chassis: "G20" }],
    description: "H&R Sport lowering springs for the G20.",
    hold: "Price was cut off the inventory list." },
  { name: "EMD Lowering Springs - G8x", price: 360, category: "lowering-springs", brand: "EMD",
    fits: [{ by: "chassis", chassis: "G80" }, { by: "chassis", chassis: "G82" }],
    description: "EMD lowering springs for the G80 M3 and G82 M4." },
  { name: "EMD Lowering Springs - F8x", price: 360, category: "lowering-springs", brand: "EMD",
    fits: [{ by: "chassis", chassis: "F80" }, { by: "chassis", chassis: "F82" }],
    description: "EMD lowering springs for the F80 M3 and F82 M4." },

  // -------------------------------------------------------- carbon fiber --
  { name: "G20 GTS Style Carbon Fiber Hood", price: 1500, category: "carbon-fiber",
    fits: [{ by: "chassis", chassis: "G20" }],
    description: "GTS style carbon fiber hood for the G20." },
  { name: "G20 / G80 CSL Style Carbon Fiber Trunk", price: 1300, category: "carbon-fiber",
    fits: [{ by: "chassis", chassis: "G20" }, { by: "chassis", chassis: "G80" }],
    description: "CSL style carbon fiber trunk lid for the G20 and G80." },
  { name: "F3x GTS Style Carbon Fiber Hood", price: 1300, category: "carbon-fiber",
    fits: [{ by: "chassis", chassis: "F30" }, { by: "chassis", chassis: "F32" }],
    description: "GTS style carbon fiber hood for F3x cars." },
  { name: "G87 / G42 CSL Style Carbon Fiber Trunk", price: 1300, category: "carbon-fiber",
    fits: [{ by: "chassis", chassis: "G87" }, { by: "chassis", chassis: "G42" }],
    description: "CSL style carbon fiber trunk lid for the G87 M2 and G42 2 Series." },
  { name: "G82 CSL Style Carbon Fiber Trunk", price: 1500, category: "carbon-fiber",
    fits: [{ by: "chassis", chassis: "G82" }],
    description: "CSL style carbon fiber trunk lid for the G82 M4." },
  { name: "G80 / G82 AN Style Carbon Fiber Hood", price: 1350, category: "carbon-fiber",
    fits: [{ by: "chassis", chassis: "G80" }, { by: "chassis", chassis: "G82" }],
    description: "AN style carbon fiber hood for the G80 M3 and G82 M4." },
];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function main() {
  console.log(APPLY ? "APPLYING\n" : "DRY RUN (pass --apply to write)\n");

  // ---- categories the new line needs that the placeholder catalog lacked ----
  const newCats = [
    { parentSlug: null, name: "Exterior", slug: "exterior" },
    { parentSlug: "exterior", name: "Carbon Fiber", slug: "carbon-fiber" },
    { parentSlug: "exterior", name: "Skid Plates", slug: "skid-plates" },
    { parentSlug: "suspension", name: "Lowering Springs", slug: "lowering-springs" },
  ];

  for (const c of newCats) {
    const found = await prisma.category.findUnique({ where: { slug: c.slug } });
    if (found) continue;
    console.log(`+ category ${c.slug}${c.parentSlug ? ` (under ${c.parentSlug})` : ""}`);
    if (!APPLY) continue;
    const parent = c.parentSlug
      ? await prisma.category.findUnique({ where: { slug: c.parentSlug } })
      : null;
    await prisma.category.create({
      data: { name: c.name, slug: c.slug, kind: "PART", parentId: parent?.id ?? null },
    });
  }

  // ---- brands ----
  for (const name of ["H&R", "EMD"]) {
    const slug = slugify(name);
    if (await prisma.brand.findUnique({ where: { slug } })) continue;
    console.log(`+ brand ${name}`);
    if (APPLY) await prisma.brand.create({ data: { name, slug } });
  }

  // ---- archive the placeholder parts, leave merch alone ----
  const stale = await prisma.product.count({
    where: { archived: false, category: { kind: "PART" } },
  });
  console.log(`\n~ archiving ${stale} placeholder parts (merch untouched)`);
  if (APPLY) {
    await prisma.product.updateMany({
      where: { archived: false, category: { kind: "PART" } },
      data: { archived: true },
    });
  }

  // ---- next free product code ----
  const codes = await prisma.product.findMany({
    where: { sku: { startsWith: "CB-" } },
    select: { sku: true },
  });
  let next = 1000;
  for (const { sku } of codes) {
    const n = Number.parseInt(sku.slice(3), 10);
    if (Number.isFinite(n) && n > next) next = n;
  }

  const models = await prisma.model.findMany({ include: { make: true } });
  const chanceBuilt = await prisma.brand.findUnique({ where: { slug: "chancebuilt" } });

  console.log(`\n+ ${ITEMS.length} products, codes from CB-${next + 1}\n`);

  let held = 0;
  for (const item of ITEMS) {
    next += 1;
    const sku = `CB-${next}`;

    // Resolve fitment to concrete chassis + year rows.
    const rows: Array<{ modelId: string; makeId: string; yearStart: number; yearEnd: number; engine: string | null; label: string }> = [];
    for (const f of item.fits) {
      const matches =
        f.by === "engine"
          ? models.filter((m) => m.engineCodes.includes(f.code))
          : models.filter(
              (m) =>
                m.chassis === f.chassis &&
                // Chassis codes repeat across models: F10 is the 535i and the
                // M5, E90/E92 are the 3 Series and the S65 M3, F87 is the N55
                // M2 and the S55 M2 Competition. Without this an N55 downpipe
                // lands on an M5.
                (!f.engine || m.engineCodes.includes(f.engine)),
            );

      for (const m of matches) {
        const from = f.by === "chassis" && f.from ? Math.max(f.from, m.yearStart) : m.yearStart;
        const to = f.by === "chassis" && f.to ? Math.min(f.to, m.yearEnd) : m.yearEnd;
        if (from > to) continue; // window falls outside this chassis's life
        rows.push({
          modelId: m.id,
          makeId: m.makeId,
          yearStart: from,
          yearEnd: to,
          engine: f.by === "engine" ? f.code : null,
          label: `${m.chassis ?? m.name} ${from}-${to}`,
        });
      }
    }

    const flag = item.hold ? "  << HELD" : "";
    console.log(
      `  ${sku}  ${item.name.padEnd(42)} ${(item.price === null ? "no price" : "$" + item.price).padStart(9)}  ${rows.length} fitment${flag}`,
    );
    if (item.hold) {
      console.log(`        ${item.hold}`);
      held++;
    }
    if (rows.length === 0) console.log(`        WARNING: no fitment resolved`);

    if (!APPLY) continue;

    const cat = await prisma.category.findUnique({ where: { slug: item.category } });
    if (!cat) throw new Error(`missing category ${item.category}`);
    const brand = item.brand
      ? await prisma.brand.findUnique({ where: { slug: slugify(item.brand) } })
      : chanceBuilt;
    if (!brand) throw new Error(`missing brand ${item.brand ?? "ChanceBuilt"}`);

    const created = await prisma.product.create({
      data: {
        name: item.name,
        sku,
        slug: `${slugify(item.name)}-${sku.toLowerCase()}`,
        description: item.description,
        priceCents: item.price === null ? 0 : Math.round(item.price * 100),
        stock: 0,
        brandId: brand.id,
        categoryId: cat.id,
        // Anything missing a price stays out of the shop until it has one,
        // rather than advertising a part at $0.00.
        archived: Boolean(item.hold && item.price === null),
      },
    });

    if (rows.length) {
      await prisma.fitment.createMany({
        data: rows.map((r) => ({
          productId: created.id,
          makeId: r.makeId,
          modelId: r.modelId,
          yearStart: r.yearStart,
          yearEnd: r.yearEnd,
          engine: r.engine,
        })),
      });
    }
  }

  console.log(`\n${held} product(s) held back pending information from the shop.`);
  console.log(APPLY ? "Done." : "\nNothing written. Re-run with --apply.");
  await prisma.$disconnect();
}

main();
