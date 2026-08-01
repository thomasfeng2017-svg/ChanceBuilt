-- CreateEnum
CREATE TYPE "ModSource" AS ENUM ('PURCHASED', 'INSTALLED_BY_SHOP', 'OWNER');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "garageVehicleId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "garageVehicleId" TEXT;

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,

    CONSTRAINT "CustomerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GarageVehicle" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "makeName" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "chassis" TEXT,
    "modelId" TEXT,
    "nickname" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GarageVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mod" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "notes" TEXT,
    "installedAt" TIMESTAMP(3),
    "source" "ModSource" NOT NULL DEFAULT 'OWNER',
    "productId" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSession_tokenHash_key" ON "CustomerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "CustomerSession_customerId_idx" ON "CustomerSession"("customerId");

-- CreateIndex
CREATE INDEX "CustomerSession_expiresAt_idx" ON "CustomerSession"("expiresAt");

-- CreateIndex
CREATE INDEX "GarageVehicle_customerId_idx" ON "GarageVehicle"("customerId");

-- CreateIndex
CREATE INDEX "Mod_vehicleId_idx" ON "Mod"("vehicleId");

-- CreateIndex
CREATE INDEX "Mod_productId_idx" ON "Mod"("productId");

-- CreateIndex
CREATE INDEX "Appointment_customerId_idx" ON "Appointment"("customerId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- AddForeignKey
ALTER TABLE "CustomerSession" ADD CONSTRAINT "CustomerSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarageVehicle" ADD CONSTRAINT "GarageVehicle_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GarageVehicle" ADD CONSTRAINT "GarageVehicle_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mod" ADD CONSTRAINT "Mod_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "GarageVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mod" ADD CONSTRAINT "Mod_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mod" ADD CONSTRAINT "Mod_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_garageVehicleId_fkey" FOREIGN KEY ("garageVehicleId") REFERENCES "GarageVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_garageVehicleId_fkey" FOREIGN KEY ("garageVehicleId") REFERENCES "GarageVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
