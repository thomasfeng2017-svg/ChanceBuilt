/**
 * Attach a generated image to a product.
 *
 * Downloads a URL, converts it to the same shape as the rest of the catalog
 * (WebP, fit inside 1200x1600, never cropped) and appends it to Product.images.
 *
 * Deliberately append rather than replace: a product that already has a real
 * photograph should keep it, and the real one should stay first.
 *
 *   node scripts/import-generated-photo.mjs <sku> <url> <filename-without-ext>
 */
import "dotenv/config";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const [sku, url, name] = process.argv.slice(2);
if (!sku || !url || !name) {
  console.error("usage: import-generated-photo.mjs <sku> <url> <filename>");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const res = await fetch(url);
if (!res.ok) throw new Error(`download failed: ${res.status}`);
const input = Buffer.from(await res.arrayBuffer());

const rel = `/products/${name}.webp`;
const out = path.join(process.cwd(), "public", "products", `${name}.webp`);

// `fit: inside` matches scripts/process-photos.ts. Nothing is cropped at build
// time anywhere in this project; framing is a render-time decision so the shop
// can change its mind without re-processing the file.
const info = await sharp(input)
  .resize(1200, 1600, { fit: "inside", withoutEnlargement: true })
  .webp({ quality: 82 })
  .toBuffer({ resolveWithObject: true });

await writeFile(out, info.data);

const product = await prisma.product.findUnique({ where: { sku } });
if (!product) throw new Error(`no product with SKU ${sku}`);

if (!product.images.includes(rel)) {
  await prisma.product.update({
    where: { sku },
    data: { images: [...product.images, rel] },
  });
}

console.log(`${sku}  ${rel}  ${info.info.width}x${info.info.height}  ${Math.round(info.data.length / 1024)}kB`);
await prisma.$disconnect();
