/**
 * Bulk fitment importer.
 *
 *   npm run import:fitment -- path/to/fitment.csv
 *   npm run import:fitment -- path/to/fitment.csv --replace
 *
 * Expected columns (header row required, order doesn't matter):
 *
 *   sku,make,model,year_start,year_end,submodel,engine,notes
 *
 * This is the seam where distributor data lands. Whether the feed comes from
 * Turn 14, Keystone, WHI or a spreadsheet you maintain by hand, normalise it to
 * these columns and this script will do the rest. Unknown makes and models are
 * created on the fly, and their production-year range is widened to cover
 * whatever the feed claims — so importing real data also builds out the vehicle
 * dropdowns.
 *
 * --replace deletes a product's existing fitment rows before inserting, which
 * is what you want for a full refresh. Without it, rows are added.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Minimal RFC4180-ish CSV parser: handles quoted fields, escaped quotes and CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else if (c !== "\r") {
      field += c;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

type Row = {
  sku: string;
  make: string;
  model: string;
  yearStart: number;
  yearEnd: number;
  submodel?: string;
  engine?: string;
  notes?: string;
};

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const replace = args.includes("--replace");

  if (!file) {
    console.error("Usage: npm run import:fitment -- <file.csv> [--replace]");
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(file, "utf8"));
  if (rows.length < 2) {
    console.error("CSV has no data rows.");
    process.exit(1);
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`Missing required column: ${name}`);
    return i;
  };
  const optionalCol = (name: string) => header.indexOf(name);

  const iSku = col("sku");
  const iMake = col("make");
  const iModel = col("model");
  const iStart = col("year_start");
  const iEnd = col("year_end");
  const iSub = optionalCol("submodel");
  const iEngine = optionalCol("engine");
  const iNotes = optionalCol("notes");

  const parsed: Row[] = [];
  const errors: string[] = [];

  rows.slice(1).forEach((r, idx) => {
    const lineNo = idx + 2;
    const yearStart = Number(r[iStart]);
    const yearEnd = Number(r[iEnd]);
    const get = (i: number) => (i === -1 ? undefined : r[i]?.trim() || undefined);

    if (!r[iSku]?.trim()) return void errors.push(`line ${lineNo}: missing sku`);
    if (!r[iMake]?.trim()) return void errors.push(`line ${lineNo}: missing make`);
    if (!r[iModel]?.trim()) return void errors.push(`line ${lineNo}: missing model`);
    if (!Number.isInteger(yearStart) || !Number.isInteger(yearEnd)) {
      return void errors.push(`line ${lineNo}: year_start/year_end must be whole numbers`);
    }
    if (yearStart > yearEnd) {
      return void errors.push(`line ${lineNo}: year_start ${yearStart} is after year_end ${yearEnd}`);
    }

    parsed.push({
      sku: r[iSku].trim(),
      make: r[iMake].trim(),
      model: r[iModel].trim(),
      yearStart,
      yearEnd,
      submodel: get(iSub),
      engine: get(iEngine),
      notes: get(iNotes),
    });
  });

  if (errors.length) {
    console.error(`Refusing to import — ${errors.length} malformed row(s):`);
    errors.slice(0, 20).forEach((e) => console.error(`  ${e}`));
    if (errors.length > 20) console.error(`  ...and ${errors.length - 20} more`);
    process.exit(1);
  }

  // Resolve products up front so an unknown SKU fails loudly rather than
  // silently dropping fitment.
  const skus = [...new Set(parsed.map((r) => r.sku))];
  const products = await prisma.product.findMany({
    where: { sku: { in: skus } },
    select: { id: true, sku: true },
  });
  const productBySku = new Map(products.map((p) => [p.sku, p.id]));

  const unknownSkus = skus.filter((s) => !productBySku.has(s));
  if (unknownSkus.length) {
    console.error(`Unknown SKUs (create these products first): ${unknownSkus.join(", ")}`);
    process.exit(1);
  }

  if (replace) {
    const deleted = await prisma.fitment.deleteMany({
      where: { productId: { in: [...productBySku.values()] } },
    });
    console.log(`Removed ${deleted.count} existing fitment row(s) for ${skus.length} product(s).`);
  }

  const makeCache = new Map<string, string>();
  const modelCache = new Map<string, string>();
  let inserted = 0;

  for (const row of parsed) {
    const makeSlug = slugify(row.make);
    let makeId = makeCache.get(makeSlug);
    if (!makeId) {
      const make = await prisma.make.upsert({
        where: { slug: makeSlug },
        update: {},
        create: { name: row.make, slug: makeSlug },
      });
      makeId = make.id;
      makeCache.set(makeSlug, makeId);
    }

    const modelSlug = slugify(row.model);
    const modelKey = `${makeSlug}/${modelSlug}`;
    let modelId = modelCache.get(modelKey);
    if (!modelId) {
      const existing = await prisma.model.findUnique({
        where: { makeId_slug: { makeId, slug: modelSlug } },
      });
      if (existing) {
        // Widen the production range if this feed knows about earlier or later years.
        const yearStart = Math.min(existing.yearStart, row.yearStart);
        const yearEnd = Math.max(existing.yearEnd, row.yearEnd);
        if (yearStart !== existing.yearStart || yearEnd !== existing.yearEnd) {
          await prisma.model.update({
            where: { id: existing.id },
            data: { yearStart, yearEnd },
          });
        }
        modelId = existing.id;
      } else {
        const created = await prisma.model.create({
          data: {
            makeId,
            name: row.model,
            slug: modelSlug,
            yearStart: row.yearStart,
            yearEnd: row.yearEnd,
          },
        });
        modelId = created.id;
      }
      modelCache.set(modelKey, modelId);
    }

    await prisma.fitment.create({
      data: {
        productId: productBySku.get(row.sku)!,
        makeId,
        modelId,
        yearStart: row.yearStart,
        yearEnd: row.yearEnd,
        submodel: row.submodel ?? null,
        engine: row.engine ?? null,
        notes: row.notes ?? null,
      },
    });
    inserted++;
  }

  console.log(`Imported ${inserted} fitment row(s) across ${skus.length} product(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
