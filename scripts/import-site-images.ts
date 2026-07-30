/**
 * Move the existing public/ photos into the SiteImage table.
 *
 *   npm run images:import
 *
 * The files stay where they are and keep working as a fallback; this just makes
 * them editable in the admin. Safe to re-run: a slot that already has rows is
 * skipped, so it never duplicates or overwrites someone's later edits.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readdirSync } from "node:fs";
import path from "node:path";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PUBLIC = path.join(process.cwd(), "public");
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

function filesIn(folder: string): string[] {
  try {
    return readdirSync(path.join(PUBLIC, folder))
      .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch {
    return [];
  }
}

/** "03-f80-m3-turbo-upgrade.webp" -> "F80 M3 Turbo Upgrade" */
const ACRONYMS = new Set(["bmw", "ecu", "dct", "cb", "s55", "s58", "s63", "b58", "n54", "n55"]);
function caption(file: string): string {
  return file
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+[-_]?/, "")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) =>
      /^[a-z]\d+$/i.test(w) || ACRONYMS.has(w.toLowerCase())
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ");
}

async function claim(slot: string): Promise<boolean> {
  const existing = await prisma.siteImage.count({ where: { slot } });
  if (existing > 0) {
    console.log(`  skip   ${slot} (${existing} already there)`);
    return false;
  }
  return true;
}

async function main() {
  let created = 0;

  // --- single-image slots ---
  const single: Array<{ folder: string; prefix: string }> = [
    { folder: "hero", prefix: "hero" },
    { folder: "engines", prefix: "engine" },
    { folder: "sections", prefix: "section" },
  ];

  for (const { folder, prefix } of single) {
    for (const file of filesIn(folder)) {
      const stem = file.replace(/\.[^.]+$/, "");
      // public/hero holds one image for the "hero" slot; the others are named.
      const slot = folder === "hero" ? "hero" : `${prefix}:${stem}`;
      if (!(await claim(slot))) continue;

      await prisma.siteImage.create({
        data: { slot, url: `/${folder}/${file}`, alt: "" },
      });
      console.log(`  create ${slot} -> /${folder}/${file}`);
      created++;

      // Only the first file in public/hero is used.
      if (folder === "hero") break;
    }
  }

  // --- gallery: many images, order preserved from filename ---
  if (await claim("gallery")) {
    const files = filesIn("gallery");
    for (const [i, file] of files.entries()) {
      await prisma.siteImage.create({
        data: {
          slot: "gallery",
          url: `/gallery/${file}`,
          alt: caption(file),
          caption: caption(file),
          sortOrder: i,
        },
      });
      created++;
    }
    if (files.length) console.log(`  create gallery -> ${files.length} images`);
  }

  const total = await prisma.siteImage.count();
  console.log(`\nCreated ${created}. ${total} site images in total.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
