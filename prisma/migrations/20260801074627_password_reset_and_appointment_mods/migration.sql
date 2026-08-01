-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "failedLogins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Mod" ADD COLUMN     "appointmentId" TEXT;

-- CreateTable
CREATE TABLE "CustomerPasswordReset" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPasswordReset_tokenHash_key" ON "CustomerPasswordReset"("tokenHash");

-- CreateIndex
CREATE INDEX "CustomerPasswordReset_customerId_idx" ON "CustomerPasswordReset"("customerId");

-- CreateIndex
CREATE INDEX "CustomerPasswordReset_expiresAt_idx" ON "CustomerPasswordReset"("expiresAt");

-- CreateIndex
CREATE INDEX "Mod_appointmentId_idx" ON "Mod"("appointmentId");

-- AddForeignKey
ALTER TABLE "CustomerPasswordReset" ADD CONSTRAINT "CustomerPasswordReset_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mod" ADD CONSTRAINT "Mod_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
