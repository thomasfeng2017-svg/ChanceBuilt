/**
 * One-off: register the converted shop videos as gallery entries.
 *
 *   npx tsx scripts/add-videos.ts
 *
 * Videos live in public/video as MP4 with a matching .jpg poster, produced by
 * scripts/convert-videos.ps1. Once Cloudinary is configured this happens on
 * upload instead and this script is only useful for bulk-loading a backlog.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const VIDEOS = [
  {
    stem: "img-7452",
    caption: "F8x M4 Single Turbo Build",
    alt: "Red BMW M4 with the hood up showing a single turbo conversion",
  },
  {
    stem: "copy-d8c91db1-74d3-4ca3-a9c3-667830e2100",
    caption: "Single Turbo M4 Engine Bay",
    alt: "Engine bay of a red BMW M4 fitted with a single turbo",
  },
  {
    stem: "copy-07bfbd22-1219-449f-b696-f6c5aedf2ce",
    caption: "Exhaust And Charge Piping",
    alt: "Stainless exhaust and charge piping laid out before installation",
  },
  {
    stem: "copy-d336fee6-a368-451b-9869-68ca3a171f5",
    caption: "ChanceBuilt Parts Kit",
    alt: "A ChanceBuilt parts kit laid out ready to fit",
  },
];

async function main() {
  const last = await prisma.siteImage.findFirst({
    where: { slot: "gallery" },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  let next = (last?.sortOrder ?? -1) + 1;

  for (const v of VIDEOS) {
    const url = `/video/${v.stem}.mp4`;
    const existing = await prisma.siteImage.findFirst({ where: { url } });
    if (existing) {
      console.log(`  skip   ${v.stem} (already registered)`);
      continue;
    }

    await prisma.siteImage.create({
      data: {
        slot: "gallery",
        url,
        kind: "VIDEO",
        posterUrl: `/video/${v.stem}.jpg`,
        alt: v.alt,
        caption: v.caption,
        sortOrder: next++,
      },
    });
    console.log(`  create ${v.caption}`);
  }

  const videos = await prisma.siteImage.count({ where: { kind: "VIDEO" } });
  console.log(`\n${videos} videos registered.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
