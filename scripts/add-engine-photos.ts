/**
 * One-off: convert hand-supplied engine photos into engine platform tiles.
 *
 *   npx tsx scripts/add-engine-photos.ts
 *
 * The main process-photos.ts manifest addresses images by index within the
 * decoded drop, which doesn't fit files dropped in later with real names. This
 * maps explicit source files to explicit slots.
 */
import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const SRC_DIR = "E:\\ChanceBuilt";
const OUT_DIR = path.join(process.cwd(), "public", "engines");

const MAP: Array<{ file: string; slot: string }> = [
  { file: "S58_Engine-crop.jpg", slot: "s58" },
  { file: "G26_M440i_engine_B58 (1).jpg", slot: "b58" },
  { file: "N54-BMW-1M.jpg", slot: "n54-n55" },
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const { file, slot } of MAP) {
    const src = path.join(SRC_DIR, file);
    if (!existsSync(src)) {
      console.error(`  MISSING  ${file}`);
      continue;
    }

    const meta = await sharp(src).metadata();
    const out = path.join(OUT_DIR, `${slot}.webp`);

    const info = await sharp(src)
      .rotate()
      .resize(900, 675, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toFile(out);

    console.log(
      `  ${slot.padEnd(8)} ${file.padEnd(34)} ${meta.width}x${meta.height} -> ${(
        info.size / 1024
      ).toFixed(0)}KB`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
