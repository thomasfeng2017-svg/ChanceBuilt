/**
 * Record intrinsic pixel dimensions on SiteImage rows that are missing them.
 *
 *   npm run images:dimensions
 *
 * Safe to re-run and safe to run after replacing files on disk: pass --all to
 * re-measure every row rather than only the empty ones, which is what you want
 * when the underlying images have been regenerated at a different size.
 *
 * Remote URLs (Cloudinary) are skipped, since they are not on this filesystem.
 *
 * MP4s are measured by parsing their `tkhd` header rather than shelling out to
 * ffprobe, which is not reliably on PATH here. That header also carries the
 * rotation matrix, which matters: a phone filming vertically stores a
 * landscape frame plus a 90-degree rotation, so the raw width and height are
 * the wrong way round and a naive read lays the video out sideways.
 */
import sharp from "sharp";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const all = process.argv.includes("--all");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Display dimensions of an MP4 video track, honouring its rotation matrix. */
function mp4Dimensions(file: string): { width: number; height: number } | null {
  const buf = readFileSync(file);
  let found: { width: number; height: number } | null = null;

  // Walk the box tree. Only the containers on the path to tkhd are descended.
  const CONTAINERS = new Set(["moov", "trak", "mdia"]);
  const walk = (start: number, end: number) => {
    let off = start;
    while (off + 8 <= end) {
      const size = buf.readUInt32BE(off);
      const type = buf.toString("ascii", off + 4, off + 8);
      if (size < 8) return;

      if (CONTAINERS.has(type)) {
        walk(off + 8, Math.min(off + size, end));
      } else if (type === "tkhd") {
        const version = buf[off + 8];
        // Skip version/flags plus the timing fields, whose widths differ by version.
        let p = off + 12 + (version === 1 ? 32 : 20);
        p += 8; // reserved
        p += 8; // layer, alternate_group, volume, reserved
        const m = [0, 1, 3, 4].map((i) => buf.readInt32BE(p + i * 4) / 65536);
        p += 36; // matrix
        const w = buf.readUInt32BE(p) / 65536;
        const h = buf.readUInt32BE(p + 4) / 65536;
        // Video tracks carry a size; audio tracks are 0x0.
        if (w > 0 && h > 0) {
          const [a, b] = m;
          const rotated = Math.abs(a) < 0.01 && Math.abs(b) > 0.99;
          found = rotated
            ? { width: Math.round(h), height: Math.round(w) }
            : { width: Math.round(w), height: Math.round(h) };
        }
      }
      off += size;
    }
  };

  walk(0, buf.length);
  return found;
}

async function main() {
  const rows = await prisma.siteImage.findMany({
    where: all ? {} : { OR: [{ width: null }, { height: null }] },
    select: { id: true, url: true, slot: true, kind: true },
  });

  console.log(`${rows.length} row(s) to measure${all ? " (--all)" : ""}\n`);

  let done = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.url.startsWith("/")) {
      skipped++; // remote (Cloudinary), not on this filesystem
      continue;
    }

    const file = path.join(process.cwd(), "public", row.url.replace(/^\//, ""));
    if (!existsSync(file)) {
      console.warn(`  !! missing file for ${row.slot}: ${row.url}`);
      skipped++;
      continue;
    }

    let size: { width: number; height: number } | null = null;
    if (row.kind === "VIDEO") {
      size = /\.mp4$/i.test(file) ? mp4Dimensions(file) : null;
    } else {
      const meta = await sharp(file).metadata();
      size = meta.width && meta.height ? { width: meta.width, height: meta.height } : null;
    }

    if (!size) {
      console.warn(`  !! could not measure ${row.slot}: ${row.url}`);
      skipped++;
      continue;
    }

    await prisma.siteImage.update({
      where: { id: row.id },
      data: { width: size.width, height: size.height },
    });

    done++;
    console.log(
      `  ${row.slot.padEnd(24)} ${row.kind.padEnd(5)} ${String(size.width).padStart(4)}x${String(
        size.height,
      ).padEnd(4)} ${size.width < size.height ? "portrait" : "landscape"}`,
    );
  }

  console.log(`\nmeasured ${done}, skipped ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
