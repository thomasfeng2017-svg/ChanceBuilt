/**
 * Turn the raw photo drop into web assets.
 *
 *   npx tsx scripts/process-photos.ts <decodedDir>
 *
 * `decodedDir` holds JPEGs produced by scripts/decode-heic.ps1 (the iPhone
 * originals are HEIC, which browsers can't display and sharp's bundled libheif
 * can't decode). Re-running is safe: outputs are overwritten.
 *
 * TWO THINGS HERE ARE LOAD-BEARING. Both were learned the hard way.
 *
 * 1. ENTRIES ARE KEYED BY FILENAME, NOT BY POSITION.
 *
 *    This manifest used to address photos by their index into a sorted listing
 *    of the drop folder. Then three files were added to that folder, one of
 *    which ("G26_M440i_engine_B58") sorts fourth, and every index from 4
 *    onward silently shifted by one. Nothing errored. Re-running would simply
 *    have republished the entire gallery against the wrong photos.
 *
 *    A filename cannot drift. If a source goes missing you get a loud warning
 *    instead of a quietly wrong site.
 *
 * 2. OUTPUTS ARE NOT CROPPED.
 *
 *    49 of the 53 photos in this drop are vertical phone shots. Squeezing those
 *    into 4:3 tiles and 1:1 product squares threw away between 25% and 65% of
 *    every frame, and sharp's "attention" heuristic chose which slice survived,
 *    which on a car photo often means a bright window rather than the car.
 *
 *    Worse, it was irreversible: the crop was baked into the .webp, so the
 *    focal-point picker in the admin had nothing left to work with.
 *
 *    Now each photo is resized to fit inside a box with its aspect ratio
 *    intact, and cropping happens at render time via CSS object-fit plus the
 *    stored focal point. Same visual result where a crop is genuinely wanted
 *    (wide banners), but reversible, adjustable by the shop, and never silently
 *    destructive.
 */
import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const SRC = process.argv[2];
if (!SRC) {
  console.error("usage: tsx scripts/process-photos.ts <decodedDir>");
  process.exit(1);
}

const PUBLIC = path.join(process.cwd(), "public");

type Dest = "hero" | "gallery" | "products" | "sections" | "engines";

type Entry = {
  /** Source filename in the decoded folder. The stable key. */
  src: string;
  dest: Dest;
  /** Filename stem: drives the gallery caption, or the section slot name. */
  name: string;
};

/**
 * Longest edge per destination. Aspect ratio is always preserved, so a vertical
 * photo comes out tall and a horizontal one comes out wide.
 */
const MAX_EDGE: Record<Dest, number> = {
  hero: 2600,
  gallery: 1800,
  products: 1600,
  sections: 2200,
  engines: 1500,
};

const QUALITY: Record<Dest, number> = {
  hero: 82,
  gallery: 80,
  products: 82,
  sections: 80,
  engines: 82,
};

const MANIFEST: Entry[] = [
  { src: "IMG_6608.jpg", dest: "hero", name: "shop-floor" },

  // --- gallery: lead with the strongest ---
  { src: "IMG_6593.jpg", dest: "gallery", name: "g80-m3-carbon-build" },
  { src: "IMG_6676.jpg", dest: "gallery", name: "g90-m5-in-for-service" },
  { src: "IMG_2754.jpg", dest: "gallery", name: "f80-m3-outside-shop" },
  { src: "IMG_6348.jpg", dest: "gallery", name: "g80-m3-on-the-lift" },
  { src: "IMG_6463.jpg", dest: "gallery", name: "a90-supra-widebody" },
  { src: "IMG_7444.jpg", dest: "gallery", name: "custom-tuning-session" },
  { src: "IMG_6892.jpg", dest: "gallery", name: "g80-m3-carbon-hood" },
  { src: "IMG_6728.jpg", dest: "gallery", name: "g87-m2-street-build" },
  { src: "IMG_6679.jpg", dest: "gallery", name: "m3-touring-build" },
  { src: "IMG_6465.jpg", dest: "gallery", name: "a90-supra-rear-quarter" },
  { src: "IMG_6737.jpg", dest: "gallery", name: "g82-m4-in-the-shop" },
  { src: "139FB781-7E36-464B-B4E8-CF8D1DF51A82.jpg", dest: "gallery", name: "f80-m3-carbon-hood" },
  { src: "IMG_6834.jpg", dest: "gallery", name: "supercharged-s65-engine-bay" },
  { src: "IMG_6766.jpg", dest: "gallery", name: "g80-m3-fuel-stop" },
  { src: "IMG_6888.jpg", dest: "gallery", name: "g20-m3-shop-visit" },
  { src: "IMG_6534.jpg", dest: "gallery", name: "a90-supra-on-the-lift" },
  { src: "IMG_8594.jpg", dest: "gallery", name: "f80-m3-turbo-build" },
  { src: "DB2C4D40-B868-4EB5-8235-D7BA0D6343E0.jpg", dest: "gallery", name: "f80-m3-bronze-wheels" },
  { src: "IMG_6771.jpg", dest: "gallery", name: "g82-m4-frozen-grey" },
  { src: "IMG_6832.jpg", dest: "gallery", name: "e92-m3-supercharger-install" },
  { src: "IMG_3408.jpg", dest: "gallery", name: "two-m4s-in-for-work" },
  { src: "IMG_6764.jpg", dest: "gallery", name: "g80-m3-rear-quarter" },
  { src: "IMG_6880.jpg", dest: "gallery", name: "f87-m2-engine-work" },
  { src: "IMG_4786.jpg", dest: "gallery", name: "g82-m4-front-end" },
  { src: "4E0D1836-D59D-4781-9F85-B38914B1B57D.jpg", dest: "gallery", name: "e90-on-the-lift" },
  { src: "IMG_6890.jpg", dest: "gallery", name: "g80-m3-exhaust-work" },
  { src: "IMG_3006.jpg", dest: "gallery", name: "f82-m4-engine-bay" },
  { src: "IMG_6885.jpg", dest: "gallery", name: "f80-m3-outside" },
  { src: "IMG_3694.jpg", dest: "gallery", name: "the-shop-riverside" },

  // --- products: bench shots wired to SKUs ---
  { src: "IMG_4526.jpg", dest: "products", name: "pure-turbos-s55" },
  { src: "IMG_1723.jpg", dest: "products", name: "pure-turbos-s58" },
  { src: "IMG_4243.jpg", dest: "products", name: "csf-intercooler-s55" },
  { src: "IMG_4242.jpg", dest: "products", name: "wagner-intercooler-b58" },
  { src: "IMG_3819.jpg", dest: "products", name: "chancebuilt-turbo-inlet-s55" },
  { src: "IMG_4706.jpg", dest: "products", name: "ngk-spark-plugs" },
  { src: "IMG_4784.jpg", dest: "products", name: "clutch-flywheel-kit" },
  { src: "IMG_3018.jpg", dest: "products", name: "eventuri-intake-s55" },
  // Second angle of the same bench setup. Two shots of one product is what
  // makes the card's hover cross-fade earn its place.
  { src: "IMG_4242.jpg", dest: "products", name: "csf-intercooler-s55-2" },
  { src: "IMG_4243.jpg", dest: "products", name: "turbo-hardware" },
  { src: "IMG_6890.jpg", dest: "products", name: "exhaust-under-car" },

  // --- sections: photography used across the rest of the site. Names are
  //     slots looked up by sectionImage(); dropping a replacement file with the
  //     same stem swaps the picture without touching code.
  { src: "IMG_7444.jpg", dest: "sections", name: "service-tuning" },
  { src: "IMG_2756.jpg", dest: "sections", name: "service-performance" },
  { src: "IMG_4785.jpg", dest: "sections", name: "service-maintenance" },
  { src: "IMG_6706.jpg", dest: "sections", name: "service-diagnostic" },
  { src: "IMG_6462.jpg", dest: "sections", name: "service-fabrication" },

  { src: "IMG_6887.jpg", dest: "sections", name: "about-shop" },
  { src: "IMG_6614.jpg", dest: "sections", name: "about-bays" },
  { src: "IMG_6677.jpg", dest: "sections", name: "contact-shop" },
  { src: "IMG_6729.jpg", dest: "sections", name: "book-shop" },
  { src: "IMG_6670.jpg", dest: "sections", name: "services-header" },
  { src: "IMG_6466.jpg", dest: "sections", name: "home-cta" },
  { src: "IMG_2977.jpg", dest: "sections", name: "parts-banner" },

  // --- engine platform tiles ---
  { src: "IMG_3018.jpg", dest: "engines", name: "s55" },
  { src: "S58_Engine-crop.jpg", dest: "engines", name: "s58" },
  { src: "G26_M440i_engine_B58 (1).jpg", dest: "engines", name: "b58" },
  { src: "N54-BMW-1M.jpg", dest: "engines", name: "n54-n55" },
];

async function main() {
  for (const dir of ["hero", "gallery", "products", "sections", "engines"]) {
    mkdirSync(path.join(PUBLIC, dir), { recursive: true });
  }

  // Gallery files are numbered so the manifest order becomes the on-page order.
  let galleryIndex = 0;
  let bytesOut = 0;
  let missing = 0;
  let portraitKept = 0;

  for (const entry of MANIFEST) {
    const input = path.join(SRC, entry.src);
    if (!existsSync(input)) {
      console.error(`  !! MISSING SOURCE ${entry.src} (for ${entry.dest}/${entry.name})`);
      missing++;
      continue;
    }

    const prefix =
      entry.dest === "gallery" ? `${String(++galleryIndex).padStart(2, "0")}-` : "";
    const outName = `${prefix}${entry.name}.webp`;
    const outPath = path.join(PUBLIC, entry.dest, outName);

    const max = MAX_EDGE[entry.dest];
    const info = await sharp(input)
      .rotate() // honour EXIF orientation before measuring anything
      // "inside" scales to fit within the box and never crops. withoutEnlargement
      // stops a small source being upscaled into softness.
      .resize(max, max, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: QUALITY[entry.dest] })
      .toFile(outPath);

    bytesOut += info.size;
    const ar = info.width / info.height;
    if (ar < 1) portraitKept++;

    console.log(
      `  ${entry.dest.padEnd(8)} ${outName.padEnd(38)} ${String(info.width).padStart(4)}x${String(
        info.height,
      ).padEnd(4)} ar=${ar.toFixed(2)} ${(info.size / 1024).toFixed(0)}KB`,
    );
  }

  console.log(
    `\n${MANIFEST.length - missing} images written (${portraitKept} kept vertical), ` +
      `${(bytesOut / 1024 / 1024).toFixed(1)}MB total.`,
  );
  if (missing) {
    console.error(`\n${missing} manifest entr${missing === 1 ? "y" : "ies"} had no source file.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
