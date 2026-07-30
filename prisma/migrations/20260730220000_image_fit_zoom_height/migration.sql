-- CreateEnum
CREATE TYPE "ImageFit" AS ENUM ('COVER', 'CONTAIN');

-- CreateEnum
CREATE TYPE "BandHeight" AS ENUM ('SHORT', 'MEDIUM', 'TALL');

-- AlterTable
ALTER TABLE "SiteImage" ADD COLUMN     "bandHeight" "BandHeight" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "fit" "ImageFit" NOT NULL DEFAULT 'COVER',
ADD COLUMN     "zoom" INTEGER NOT NULL DEFAULT 100;

