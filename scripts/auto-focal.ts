/**
 * Choose a sensible default focal point for every slot image.
 *
 *   npm run images:focal          # only images still at dead centre
 *   npm run images:focal -- --all # re-derive for every image
 *
 * Why this exists:
 *
 * Photos are now stored uncropped, and the crop happens at render time from the
 * stored focal point. That is the right way round, but it means a slot's
 * default matters: a vertical photo centred inside a 21:9 banner keeps a thin
 * horizontal band from the middle of the frame, which on a shot of a car in a
 * workshop is usually the floor.
 *
 * The old build-time pipeline avoided this by letting sharp's "attention"
 * heuristic pick the crop. That produced decent framing but baked it into the
 * file forever. This does the same analysis and stores the RESULT as a focal
 * point, so the framing is just as good to start with and the shop can still
 * drag it afterwards.
 *
 * Slots are matched to the shape they actually render at, from image-slots.ts.
 * The gallery is skipped: it lays photos out at their own aspect ratio now, so
 * there is nothing to crop and no focal point to choose.
 */
import sharp from "sharp";
import { existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { ALL_SLOTS, ASPECT_RATIO, GALLERY_SLOT } from "../src/lib/image-slots";

const all = process.argv.includes("--all");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/**
 * Where sharp's attention heuristic would crop, expressed as the centre of that
 * crop in percent. That is exactly what CSS object-position wants.
 */
async function focalFor(file: string, targetAspect: number) {
  const meta = await sharp(file).metadata();
  if (!meta.width || !meta.height) return null;

  // Ask for the largest box of the target shape that fits inside the source,
  // so the crop is a real decision rather than a rescale.
  let cropW = meta.width;
  let cropH = Math.round(cropW / targetAspect);
  if (cropH > meta.height) {
    cropH = meta.height;
    cropW = Math.round(cropH * targetAspect);
  }
  if (cropW < 2 || cropH < 2) return null;

  const { info } = await sharp(file)
    .resize(cropW, cropH, { fit: "cover", position: "attention" })
    .toBuffer({ resolveWithObject: true });

  // sharp reports where it took the crop from, in source pixels.
  const left = info.cropOffsetLeft ? Math.abs(info.cropOffsetLeft) : 0;
  const top = info.cropOffsetTop ? Math.abs(info.cropOffsetTop) : 0;

  // object-position is the point of the IMAGE aligned to the same point of the
  // BOX, so the usable range is the leftover space, not the full dimension.
  const slackX = meta.width - cropW;
  const slackY = meta.height - cropH;

  return {
    x: slackX > 0 ? Math.round((left / slackX) * 100) : 50,
    y: slackY > 0 ? Math.round((top / slackY) * 100) : 50,
  };
}

async function main() {
  const aspectBySlot = new Map(ALL_SLOTS.map((s) => [s.slot, ASPECT_RATIO[s.aspect]]));

  const rows = await prisma.siteImage.findMany({
    where: {
      slot: { not: GALLERY_SLOT },
      kind: "IMAGE",
      ...(all ? {} : { focalX: 50, focalY: 50 }),
    },
    select: { id: true, slot: true, url: true },
  });

  console.log(`${rows.length} image(s) to analyse${all ? " (--all)" : ""}\n`);

  let done = 0;
  let skipped = 0;

  for (const row of rows) {
    const aspect = aspectBySlot.get(row.slot);
    if (!aspect || !row.url.startsWith("/")) {
      skipped++;
      continue;
    }

    const file = path.join(process.cwd(), "public", row.url.replace(/^\//, ""));
    if (!existsSync(file)) {
      console.warn(`  !! missing file for ${row.slot}`);
      skipped++;
      continue;
    }

    const focal = await focalFor(file, aspect);
    if (!focal) {
      skipped++;
      continue;
    }

    await prisma.siteImage.update({
      where: { id: row.id },
      data: { focalX: focal.x, focalY: focal.y },
    });

    done++;
    console.log(
      `  ${row.slot.padEnd(30)} ${String(focal.x).padStart(3)}% ${String(focal.y).padStart(3)}%`,
    );
  }

  console.log(`\nset ${done}, skipped ${skipped}`);
  console.log("These are starting points. Drag any of them in Photos to override.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
