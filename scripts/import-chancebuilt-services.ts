/**
 * Load ChanceBuilt's real service list.
 *
 * Replaces the placeholder services the site shipped with, the same way the
 * product import replaced the placeholder catalogue. Those were invented to
 * make the pages look finished; these are the jobs Chance actually sells.
 *
 * Two things are deliberately NOT set here, because they are Chance's to
 * decide and guessing at them would be worse than leaving them obviously
 * unset:
 *
 *   Price. Every service is loaded quote-only, which the site already renders
 *   as "Quote / after review". A made-up number on a brake job is a number a
 *   customer will hold him to.
 *
 *   Duration is a guess, and it matters more than it looks: slot length is what
 *   stops the calendar double-booking. The estimates below lean long, so the
 *   failure mode is an empty slot rather than two cars booked into one bay on
 *   the same afternoon. Chance can correct them under Admin > Services.
 *
 * Normally you do not need this. The same load is a button in the admin, under
 * Services, which is the sensible route because it does not require anyone to
 * handle a database password. This exists for loading a database the admin
 * cannot reach, such as a local one or a restored backup.
 *
 *   DATABASE_URL="postgres://..." npx tsx scripts/import-chancebuilt-services.ts
 *
 * Add --apply to write. Without it this prints what it would do and exits,
 * because it deletes services that are not in the list.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  CHANCEBUILT_SERVICES as SERVICES,
  serviceSlug as slugify,
} from "../src/lib/chancebuilt-services";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const APPLY = process.argv.includes("--apply");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const existing = await prisma.service.findMany({
    select: { id: true, name: true, slug: true },
  });
  const wanted = new Map(SERVICES.map((s) => [slugify(s.name), s]));

  const stale = existing.filter((e) => !wanted.has(e.slug));
  const booked = stale.length
    ? await prisma.appointment.groupBy({
        by: ["serviceId"],
        where: { serviceId: { in: stale.map((s) => s.id) } },
        _count: { _all: true },
      })
    : [];
  const bookedIds = new Set(booked.map((b) => b.serviceId));

  console.log(`Services in the database: ${existing.length}`);
  console.log(`Services in Chance's list: ${SERVICES.length}`);
  console.log(`\nNot in the list, removing (${stale.length}):`);
  for (const s of stale) {
    // A service with appointments against it cannot simply be deleted without
    // taking the booking history with it, so retire it instead.
    console.log(`  ${bookedIds.has(s.id) ? "retire (has bookings)" : "delete"}  ${s.name}`);
  }


  if (!APPLY) {
    console.log("\nDry run. Re-run with --apply to write.");
    return;
  }

  let created = 0;
  let updated = 0;

  for (const [index, svc] of SERVICES.entries()) {
    const slug = slugify(svc.name);
    const data = {
      name: svc.name,
      blurb: svc.blurb,
      description: svc.description,
      category: svc.category,
      // Quote-only until Chance sets prices. See the note at the top.
      priceFromCents: null,
      priceNote: null,
      durationMinutes: svc.minutes,
      turnaround: svc.turnaround ?? null,
      requiresVehicle: true,
      sortOrder: index,
      active: true,
    };

    const before = await prisma.service.findUnique({ where: { slug } });
    await prisma.service.upsert({
      where: { slug },
      create: { slug, ...data },
      update: data,
    });
    if (before) updated++;
    else created++;
  }

  let deleted = 0;
  let retired = 0;
  for (const s of stale) {
    if (bookedIds.has(s.id)) {
      await prisma.service.update({ where: { id: s.id }, data: { active: false } });
      retired++;
    } else {
      await prisma.service.delete({ where: { id: s.id } });
      deleted++;
    }
  }

  console.log(`\ncreated ${created}, updated ${updated}, deleted ${deleted}, retired ${retired}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
