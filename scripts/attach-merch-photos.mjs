/**
 * Point the four ChanceBuilt merch products at their photo files.
 *
 * The photo files ship with the deployment, but which photos a product has is a
 * database fact, so importing them locally leaves production still showing
 * placeholders. This sets the same four rows wherever DATABASE_URL points.
 *
 * Appends rather than replaces, and skips a product that already has the file,
 * so it is safe to re-run and cannot clobber a real photograph added later.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const MERCH = {
  "CB-1054": "/products/chancebuilt-hoodie-black.webp",
  "CB-1055": "/products/chancebuilt-tee-black.webp",
  "CB-1056": "/products/chancebuilt-snapback-black.webp",
  "CB-1057": "/products/chancebuilt-sticker-pack.webp",
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

for (const [sku, rel] of Object.entries(MERCH)) {
  const product = await prisma.product.findUnique({
    where: { sku },
    select: { images: true },
  });

  if (!product) {
    console.log(`${sku}  no such product`);
    continue;
  }
  if (product.images.includes(rel)) {
    console.log(`${sku}  already attached`);
    continue;
  }

  const updated = await prisma.product.update({
    where: { sku },
    data: { images: [...product.images, rel] },
    select: { images: true },
  });
  console.log(`${sku}  ${JSON.stringify(updated.images)}`);
}

await prisma.$disconnect();
