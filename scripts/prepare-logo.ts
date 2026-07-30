/**
 * Turn a supplied logo into web brand assets.
 *
 *   npx tsx scripts/prepare-logo.ts <sourceFile>
 *
 * The logo arrived as a 225x225 JPEG: white artwork on a solid black square,
 * with no alpha channel. Dropping that into the header as-is would put a black
 * tile on a near-black page, and every JPEG artifact around the letterforms
 * would show as grey haze.
 *
 * White-on-black is the one case where alpha can be recovered exactly, because
 * the source is effectively already premultiplied against black:
 *
 *   alpha = luminance          (black background -> 0, white artwork -> 1)
 *   colour = pixel / alpha     (undo the premultiply, so it works on any bg)
 *
 * A toe below TOE_CUT forces near-black to fully transparent, which is what
 * removes the JPEG mush rather than leaving it as a faint grey halo.
 *
 * Outputs:
 *   public/brand/logo.png      full lockup, transparent, padding trimmed
 *   public/brand/monogram.png  the CB mark alone
 *   src/app/icon.png           monogram only, for the browser tab
 *   src/app/apple-icon.png     monogram on a dark tile, for iOS bookmarks
 *
 * The header uses the monogram plus typeset text rather than the full lockup.
 * The supplied artwork is only 86px tall in total, so at a 42px header the
 * baked-in wordmark renders as unreadable mush, while live text stays crisp at
 * any size. Swap to the lockup once a vector version exists.
 *
 * The monogram is separated from the wordmark by finding the widest empty
 * horizontal band, so it does not depend on hardcoded crop coordinates.
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SRC = process.argv[2];
if (!SRC) {
  console.error("usage: tsx scripts/prepare-logo.ts <sourceFile>");
  process.exit(1);
}

/** Below this luminance a pixel is background, not faint artwork. */
const TOE_CUT = 0.1;
/** At and above this luminance the artwork is fully opaque. */
const SHOULDER = 0.5;

async function toTransparent(src: string) {
  const { data, info } = await sharp(src)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);

  for (let p = 0, q = 0; p < data.length; p += channels, q += 4) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];

    // Rec. 709 luminance, normalised.
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

    let a = 0;
    if (lum > TOE_CUT) {
      a = Math.min(1, (lum - TOE_CUT) / (SHOULDER - TOE_CUT));
    }

    if (a <= 0) {
      out[q] = out[q + 1] = out[q + 2] = out[q + 3] = 0;
      continue;
    }

    // Undo the premultiply so the mark keeps its bevel greys and still reads
    // correctly if it is ever placed on a light background.
    out[q] = Math.min(255, Math.round(r / a));
    out[q + 1] = Math.min(255, Math.round(g / a));
    out[q + 2] = Math.min(255, Math.round(b / a));
    out[q + 3] = Math.round(a * 255);
  }

  return sharp(out, { raw: { width, height, channels: 4 } }).png();
}

/**
 * Row indices where the image is entirely transparent, used to find the gap
 * between the monogram and the wordmark beneath it.
 */
async function emptyRows(png: sharp.Sharp) {
  const { data, info } = await png
    .clone()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rows: boolean[] = [];
  for (let y = 0; y < info.height; y++) {
    let ink = false;
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > 8) {
        ink = true;
        break;
      }
    }
    rows.push(!ink);
  }
  return rows;
}

/**
 * Assemble a multi-resolution .ico from PNG payloads.
 *
 * sharp cannot write .ico, and Next's starter favicon.ico otherwise stays in
 * src/app/ and wins over icon.png in browsers that request /favicon.ico
 * directly. The container is small enough to build by hand: a 6-byte header, a
 * 16-byte directory entry per size, then the PNG bytes. Every current browser
 * accepts PNG-compressed entries.
 */
function buildIco(images: { size: number; png: Buffer }[]): Buffer {
  const HEADER = 6;
  const ENTRY = 16;
  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = HEADER + ENTRY * images.length;
  const entries: Buffer[] = [];

  for (const { size, png } of images) {
    const e = Buffer.alloc(ENTRY);
    // 0 encodes 256 in a single byte.
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // palette size
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

async function main() {
  mkdirSync(path.join("public", "brand"), { recursive: true });

  const meta = await sharp(SRC).metadata();
  console.log(`source: ${meta.format} ${meta.width}x${meta.height} alpha=${meta.hasAlpha}`);

  // Full lockup, padding removed.
  const lockupBuf = await (await toTransparent(SRC)).trim({ threshold: 1 }).toBuffer();
  const lockup = sharp(lockupBuf);
  const lockupMeta = await lockup.metadata();
  await lockup.clone().toFile("public/brand/logo.png");
  console.log(`public/brand/logo.png        ${lockupMeta.width}x${lockupMeta.height}`);

  // Find the widest run of empty rows: the gap under the monogram.
  const rows = await emptyRows(lockup);
  let best = { start: 0, len: 0 };
  let run = 0;
  for (let y = 0; y < rows.length; y++) {
    if (rows[y]) {
      run++;
      if (run > best.len) best = { start: y - run + 1, len: run };
    } else {
      run = 0;
    }
  }

  const height = lockupMeta.height!;
  const width = lockupMeta.width!;

  if (best.len < 2 || best.start < height * 0.25) {
    console.warn("  !! no clear gap found; using the whole lockup for the icon");
    best = { start: height, len: 0 };
  }

  const monogram = sharp(lockupBuf)
    .extract({ left: 0, top: 0, width, height: best.start })
    .trim({ threshold: 1 });

  const monoBuf = await monogram.toBuffer();
  const monoMeta = await sharp(monoBuf).metadata();
  await sharp(monoBuf).toFile("public/brand/monogram.png");
  console.log(`public/brand/monogram.png    ${monoMeta.width}x${monoMeta.height}`);

  // Browser tab icon: square, transparent, the mark centred with a little air.
  await sharp({
    create: {
      width: 256,
      height: 256,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: await sharp(monoBuf).resize(216, 216, { fit: "inside" }).toBuffer(), gravity: "center" },
    ])
    .png()
    .toFile("src/app/icon.png");
  console.log("src/app/icon.png             256x256");

  // iOS bookmarks composite onto white unless the icon is opaque, and a white
  // tile behind a white mark is an empty square. Give it the site's own ink.
  await sharp({
    create: { width: 180, height: 180, channels: 4, background: { r: 5, g: 5, b: 5, alpha: 1 } },
  })
    .composite([
      { input: await sharp(monoBuf).resize(140, 140, { fit: "inside" }).toBuffer(), gravity: "center" },
    ])
    .png()
    .toFile("src/app/apple-icon.png");
  console.log("src/app/apple-icon.png       180x180");

  // favicon.ico, replacing the framework default.
  const icoSizes = [32, 48, 256];
  const icoImages = await Promise.all(
    icoSizes.map(async (size) => ({
      size,
      png: await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([
          {
            input: await sharp(monoBuf)
              .resize(Math.round(size * 0.86), Math.round(size * 0.86), { fit: "inside" })
              .toBuffer(),
            gravity: "center",
          },
        ])
        .png()
        .toBuffer(),
    })),
  );

  writeFileSync("src/app/favicon.ico", buildIco(icoImages));
  console.log(`src/app/favicon.ico          ${icoSizes.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
