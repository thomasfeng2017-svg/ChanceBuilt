-- Splits "how long is the appointment" from "how long is my car with you".
-- One number was doing both, so drop-off jobs advertised their intake slot as
-- the whole job: the site said a motor swap took one hour.
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "turnaround" TEXT;
