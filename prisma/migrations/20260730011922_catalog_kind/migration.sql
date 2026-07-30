-- CreateEnum
CREATE TYPE "CatalogKind" AS ENUM ('PART', 'MERCH');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "kind" "CatalogKind" NOT NULL DEFAULT 'PART';

-- CreateIndex
CREATE INDEX "Category_kind_parentId_idx" ON "Category"("kind", "parentId");


-- Backfill. Apparel was the only non-part department, and its products carried
-- isUniversal purely so they would survive the fitment filter. Kind replaces
-- that hack, so clear the flag: a hoodie does not "fit any vehicle".
UPDATE "Category" SET "kind" = 'MERCH'
WHERE "name" = 'Apparel'
   OR "parentId" IN (SELECT "id" FROM "Category" WHERE "name" = 'Apparel');

UPDATE "Product" SET "isUniversal" = false
WHERE "categoryId" IN (SELECT "id" FROM "Category" WHERE "kind" = 'MERCH');
