/**
 * Build numbered contact sheets from a folder of photos.
 *
 *   npx tsx scripts/contact-sheet.ts <srcDir> <outDir>
 *
 * Used to review a large photo drop quickly: instead of opening 50 files, you
 * get four grids with an index number burned into each cell, plus an index.json
 * mapping number -> filename.
 */
import sharp from "sharp";
import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SRC = process.argv[2];
const OUT = process.argv[3];
if (!SRC || !OUT) {
  console.error("usage: tsx scripts/contact-sheet.ts <srcDir> <outDir>");
  process.exit(1);
}

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"]);
const COLS = 5;
const ROWS = 3;
// Portrait cells, letterboxed rather than cropped. Nearly all of this shop's
// photography is shot vertically on a phone, and a sheet that crops to
// landscape hides exactly the thing you are reviewing the sheet to judge.
const CELL_W = 300;
const CELL_H = 400;
const PER_SHEET = COLS * ROWS;

async function main() {
  mkdirSync(OUT, { recursive: true });

  const files = readdirSync(SRC)
    .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  console.log(`${files.length} images -> ${Math.ceil(files.length / PER_SHEET)} sheets`);
  writeFileSync(
    path.join(OUT, "index.json"),
    JSON.stringify(files.map((f, i) => ({ n: i + 1, file: f })), null, 2),
  );

  for (let sheet = 0; sheet * PER_SHEET < files.length; sheet++) {
    const batch = files.slice(sheet * PER_SHEET, (sheet + 1) * PER_SHEET);

    const composites = await Promise.all(
      batch.map(async (file, i) => {
        const n = sheet * PER_SHEET + i + 1;
        const thumb = await sharp(path.join(SRC, file))
          .rotate() // honour EXIF orientation
          .resize(CELL_W, CELL_H, {
            fit: "contain",
            background: { r: 20, g: 20, b: 20 },
          })
          .jpeg({ quality: 70 })
          .toBuffer();

        // Burn the index number into the corner so I can refer to it later.
        const label = Buffer.from(
          `<svg width="${CELL_W}" height="${CELL_H}">
             <rect x="0" y="0" width="54" height="34" fill="black" fill-opacity="0.75"/>
             <text x="10" y="25" font-family="sans-serif" font-size="22"
                   font-weight="bold" fill="white">${n}</text>
           </svg>`,
        );
        const cell = await sharp(thumb)
          .composite([{ input: label, top: 0, left: 0 }])
          .toBuffer();

        return {
          input: cell,
          top: Math.floor(i / COLS) * CELL_H,
          left: (i % COLS) * CELL_W,
        };
      }),
    );

    const outPath = path.join(OUT, `sheet-${sheet + 1}.jpg`);
    await sharp({
      create: {
        width: COLS * CELL_W,
        height: ROWS * CELL_H,
        channels: 3,
        background: { r: 20, g: 20, b: 20 },
      },
    })
      .composite(composites)
      .jpeg({ quality: 76 })
      .toFile(outPath);

    console.log(`  ${outPath} (${batch.length} images)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
