-- Chance groups his work into brakes and suspension/drivetrain, which did not
-- map onto any of the five existing categories. Brake jobs were landing under
-- maintenance and suspension under performance, which is not how he or his
-- customers talk about them.
ALTER TYPE "ServiceCategory" ADD VALUE IF NOT EXISTS 'BRAKES';
ALTER TYPE "ServiceCategory" ADD VALUE IF NOT EXISTS 'SUSPENSION';
